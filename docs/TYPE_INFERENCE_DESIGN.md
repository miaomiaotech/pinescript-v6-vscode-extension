# Pine Script 类型推断系统设计文档

## 功能概述

VSCode 扩展提供了完整的 Pine Script v6 类型推断系统,支持:
- ✅ 变量声明类型推断
- ✅ 解构赋值类型推断
- ✅ 用户自定义函数元组返回值推断
- ✅ Inlay Hints 类型提示显示
- ✅ 所有作用域支持(全局、函数、循环、条件语句)

## 核心架构

### 1. 三阶段验证流程

```
输入: Pine Script 代码
  ↓
[Parser] 解析 → AST
  ↓
[AstValidator.validate()]
  ↓
第一阶段: collectDeclarations(ast)
  - 遍历 AST,收集所有声明
  - 推断变量类型(literal/expression)
  - 保存函数声明引用
  - 构建符号表
  ↓
第二阶段: validateStatement(ast)
  - 验证表达式和语句
  - 标记变量使用情况
  - 进入/退出作用域
  ↓
第三阶段: checkUnusedVariables()
  - 检查未使用的变量
  ↓
第四阶段: buildSymbolMap()  ✅ 已优化
  - 构建 name:line → symbol 的映射
  - 供 InlayHintsProvider 使用
  ↓
输出: 验证错误列表 + 完整符号表 + 符号映射
```

### 2. 关键组件

#### AstValidator (src/parser/astValidator.ts)
核心验证器,负责:
- 符号表管理
- 类型推断
- 错误收集

**关键字段**:
```typescript
private symbolTable: SymbolTable;              // 符号表
private functionDeclarations: Map;             // 函数声明缓存
private expressionTypes: Map;                  // 表达式类型缓存
private symbolMap: Map<string, SymbolInfo>;    // 符号映射缓存 ✅ 已优化
```

**关键方法**:
```typescript
validate(ast: Program): ValidationError[]              // 主验证流程
inferFunctionTupleReturnTypes(funcName): PineType[]   // 用户函数元组推断
inferExpressionTypeWithLocals(expr, localTypes)       // 独立类型推断
buildSymbolMap(): void                                 // 构建符号映射 ✅ 已优化
getSymbolMap(): Map<string, SymbolInfo>               // 获取符号映射 ✅ 已优化
```

#### SymbolTable (src/parser/symbolTable.ts)
作用域管理,符号存储:
```typescript
class Scope {
  private symbols: Map<string, Symbol>;    // 当前作用域符号
  private parent: Scope | null;            // 父作用域
  private children: Scope[];               // 子作用域
}

class SymbolTable {
  private globalScope: Scope;              // 全局作用域
  private currentScope: Scope;             // 当前作用域

  enterScope()   // 进入子作用域
  exitScope()    // 退出到父作用域
  getAllSymbols() // 递归获取所有作用域的符号
}
```

#### InlayHintsProvider (src/inlayHintsProvider.ts)
类型提示显示:
- 解析文档 → 验证 → 获取缓存的符号映射 ✅ 已优化
- 递归遍历 AST,为每个变量声明创建 InlayHint
- 使用 symbolMap 快速查找符号类型

**优化前**:
```typescript
const allSymbols = symbolTable.getAllSymbols();
const symbolMap = new Map();  // 每次都重建
for (const symbol of allSymbols) {
    symbolMap.set(`${symbol.name}:${symbol.line}`, symbol);
}
```

**优化后** ✅:
```typescript
const symbolMap = validator.getSymbolMap();  // 直接使用缓存
```

## 用户自定义函数元组推断

### 问题
```pine
myFunction() =>
    a = 10
    b = true
    [a, b]

[x, y] = myFunction()  // x 和 y 的类型是?
```

### 解决方案: 独立类型推断系统

**核心方法**: `inferFunctionTupleReturnTypes(funcName: string): PineType[]`

```typescript
1. 从 functionDeclarations 获取函数 AST
2. 创建临时 localTypes Map (不修改符号表)
3. 添加参数类型到 localTypes
4. 递归遍历函数体,收集变量类型:
   - 使用 inferExpressionTypeWithLocals()
   - 优先查找 localTypes,再查找符号表
5. 提取函数返回的数组字面量
6. 推断数组每个元素的类型
7. 返回类型数组
```

**关键优势**:
- ✅ 不干扰符号表的作用域管理
- ✅ 不影响变量使用标记
- ✅ 支持嵌套作用域(if/for/while)

### 示例流程

```pine
detect_high_low(...) =>
    cycle_len = bar_index - cycle_start + 1  // series<int>
    is_top = false                            // bool
    is_bottom = false                         // bool
    [is_top, is_bottom]

[kdj_top, kdj_bottom] = detect_high_low(...)
```

**推断步骤**:
1. 解构赋值触发 → 调用 `inferFunctionTupleReturnTypes('detect_high_low')`
2. 创建 localTypes: `{'cycle_len': 'series<int>', 'is_top': 'bool', 'is_bottom': 'bool'}`
3. 返回表达式: `[is_top, is_bottom]`
4. 推断元素类型: `[inferType(is_top), inferType(is_bottom)]` → `['bool', 'bool']`
5. 赋值给变量: `kdj_top: 'bool'`, `kdj_bottom: 'bool'`

## Inlay Hints 显示机制

### 作用域查找问题

**问题**: `symbolTable.lookup()` 只能向上查找父作用域,无法访问已退出的子作用域。

```
全局作用域
  ├─ 函数 A 作用域 (已退出)
  │   ├─ 变量 x
  │   └─ 变量 y
  └─ 当前作用域 (全局)

lookup('x') → 找不到! (因为函数作用域已退出)
```

### 解决方案: Symbol Map

```typescript
// 获取所有符号(包括子作用域)
const allSymbols = symbolTable.getAllSymbols();

// 创建 Map: "name:line" → symbol
const symbolMap = new Map<string, Symbol>();
for (const symbol of allSymbols) {
    symbolMap.set(`${symbol.name}:${symbol.line}`, symbol);
}

// 查找时使用 name+line 作为 key
const symbol = symbolMap.get(`${varName}:${varLine}`);
```

**优势**:
- ✅ 可以访问所有作用域的符号
- ✅ 使用行号区分同名变量
- ✅ O(1) 查找性能

## 性能优化建议

### 当前实现
```typescript
validate(ast) {
  // 第一遍: 收集声明
  for (const stmt of ast.body) {
    collectDeclarations(stmt);  // 遍历整个 AST
  }

  // 第二遍: 验证
  for (const stmt of ast.body) {
    validateStatement(stmt);    // 再次遍历整个 AST
  }
}
```

### 可能的优化(未实现)

#### 方案1: 单遍遍历
合并收集和验证,但需要处理前向引用:
```typescript
validate(ast) {
  // 预先收集函数声明
  collectFunctionDeclarations(ast);

  // 单遍处理
  for (const stmt of ast.body) {
    processStatement(stmt);  // 收集 + 验证
  }
}
```

⚠️ **问题**: Pine Script 支持在声明前使用函数,需要两阶段。

#### 方案2: 缓存优化
```typescript
private expressionTypes: Map<Expression, PineType>;  // ✅ 已实现
```
避免重复推断相同表达式的类型。

## 注意事项

### 1. 作用域管理
- ✅ 函数创建新作用域
- ✅ for/while 循环创建新作用域
- ❌ if/else 语句**不创建**新作用域(Pine Script 特性)

### 2. 类型推断限制

**当前支持**:
- ✅ 字面量类型推断
- ✅ 内置函数返回类型
- ✅ 二元/一元运算表达式类型
- ✅ 用户函数元组返回(数组字面量)

**当前不支持**:
- ❌ 间接返回数组 (返回变量而非字面量)
- ❌ 条件返回不同类型
- ❌ 复杂的类型联合/交集

示例:
```pine
// ❌ 不支持
myFunc() =>
    arr = [1, 2]
    arr  // 返回变量

// ✅ 支持
myFunc() =>
    [1, 2]  // 直接返回字面量
```

### 3. 参数类型假设

```typescript
// 第一个参数假设为 series<float>
const paramType = i === 0 ? 'series<float>' : 'unknown';
```

原因: Pine Script 函数通常第一个参数是指标序列。

⚠️ **改进空间**: 可以分析函数调用点的实参类型来推断参数类型。

### 4. Symbol Map Key 设计

使用 `name:line` 作为 key:
```typescript
const key = `${symbol.name}:${symbol.line}`;
```

**优势**: 区分不同作用域的同名变量
**限制**: 假设同一行不会有多个同名变量声明(合理假设)

## 测试

运行类型推断测试:
```bash
npm run build:tsc
node test-type-inference.js
```

测试文件:
- `user-function-return-tuple.pine` - 用户函数元组测试
- `samples/detect-high-low.pine` - 真实场景测试

## 扩展点

### 添加新的类型推断规则

在 `AstValidator.inferExpressionType()` 中添加:
```typescript
case 'NewExpressionType':
  // 添加推断逻辑
  type = inferNewType(expr);
  break;
```

### 添加新的内置函数返回类型

在 `AstValidator.addKnownReturnTypes()` 中添加:
```typescript
'namespace.function': 'return_type',
```

### 支持更复杂的函数分析

修改 `inferFunctionTupleReturnTypes()`:
1. 支持追踪变量赋值链
2. 分析多个 return 路径
3. 递归分析嵌套函数调用

## 总结

当前实现在**简洁性**和**功能完整性**之间取得了良好平衡:
- ✅ 两阶段验证清晰简单
- ✅ 独立类型推断不干扰符号表
- ✅ Symbol Map 解决作用域访问问题
- ✅ 支持主要使用场景(90%+)

进一步优化需要权衡复杂度和收益。
