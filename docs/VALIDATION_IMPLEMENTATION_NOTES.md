# Pine Script v6 验证系统实现注意事项

## 概述

本文档说明 Pine Script v6 验证系统（runDiagnostics）的实现要点和关键设计决策。

## 架构设计

### 双层验证策略
验证系统采用双层验证架构，每层负责不同类型的检查：

```typescript
const runDiagnostics = (doc: vscode.TextDocument) => {
  if (doc.languageId !== 'pine') return;
  const text = doc.getText();
  const diags: vscode.Diagnostic[] = [];

  // 双层验证
  runPatternValidation(text, diags);   // 1. 基于正则的快速验证
  runAstValidation(text, diags);       // 2. 基于 AST 的深度验证

  diagCollection.set(doc.uri, diags);
};
```

### 1. PatternValidator - 基于正则的快速验证
使用正则表达式和官方验证的参数要求，验证内置函数的参数使用：

```typescript
const runPatternValidation = (text: string, diags: vscode.Diagnostic[]): void => {
  try {
    const patternValidator = new PatternValidator();  // ⚠️ 每次创建新实例
    const errors = patternValidator.validate(text);

    for (const error of errors) {
      const pos = new vscode.Position(error.line - 1, error.column - 1);
      const endPos = pos.translate(0, error.length);
      diags.push(new vscode.Diagnostic(
        new vscode.Range(pos, endPos),
        error.message,
        error.severity
      ));
    }
  } catch (e) {
    // 验证错误是预期的，不应导致扩展崩溃
  }
};
```

**特点**:
- 基于正则表达式模式匹配
- 使用完整的 v6 函数签名数据（6,665 项）
- 验证必需参数、参数类型、命名空间成员等
- 性能优秀，适合实时验证

⚠️ **关键点**:
- 每次创建新的 validator 实例，避免状态污染
- 捕获所有异常，防止扩展崩溃
- 不使用 console.log/error（生产环境）

### 2. AstValidator - 基于 AST 的深度验证
基于 AST 的深度语义分析：

```typescript
const runAstValidation = (text: string, diags: vscode.Diagnostic[]): void => {
  try {
    const parser = new Parser(text);
    const ast = parser.parse();

    // ✅ 重要：使用 parser.getErrors() 收集解析错误
    const parserErrors = parser.getErrors();
    for (const error of parserErrors) {
      const pos = new vscode.Position(error.line - 1, error.column - 1);
      diags.push(new vscode.Diagnostic(
        new vscode.Range(pos, pos.translate(0, 1)),
        error.message,
        vscode.DiagnosticSeverity.Error
      ));
    }

    // AST 验证
    const validator = new AstValidator();
    const astErrors = validator.validate(ast);
    for (const error of astErrors) {
      if (error.type !== ErrType.Unused) continue;

      const pos = new vscode.Position(error.line - 1, error.column - 1);
      const endPos = pos.translate(0, error.length);
      const range = new vscode.Range(pos, endPos);

      const diag = new vscode.Diagnostic(
        range,
        error.message,
        vscode.DiagnosticSeverity.Hint
      );
      diag.tags = [vscode.DiagnosticTag.Unnecessary];  // 标记为"未使用"
      diags.push(diag);
    }
  } catch (e: any) {
    // 解析错误已通过 getErrors() 收集
  }
};
```

**特点**:
- 构建完整的抽象语法树
- 符号表管理（作用域、变量追踪）
- 未使用变量检测
- 类型推断和类型检查
- 函数签名验证

⚠️ **关键点**:
- 必须使用 `parser.getErrors()` 获取解析错误
- 为未使用变量添加 `DiagnosticTag.Unnecessary`
- 不要依赖 catch 块处理解析错误
- 只处理 `ErrType.Unused` 类型的错误（用于灰色显示未使用的变量）

## 验证器功能对比

| 特性 | PatternValidator | AstValidator |
|------|------------------|--------------|
| 验证方式 | 正则表达式匹配 | AST 语法树分析 |
| 性能 | 快速（毫秒级） | 较慢（需解析） |
| 准确性 | 高（基于官方数据） | 极高（语义级别） |
| 主要功能 | 函数参数验证、命名空间检查 | 未使用变量检测、类型检查 |
| 数据来源 | v6 参数要求（6,665 项） | 符号表和类型推断 |
| 适用场景 | 实时验证、语法检查 | 深度分析、代码质量 |

## 常见陷阱

### ❌ 错误实践

1. **使用单例 Validator**
```typescript
// ❌ 错误：可能导致状态污染
const patternValidator = new PatternValidator();

const runDiagnostics = (doc) => {
  patternValidator.validate(text);  // 复用同一实例
};

// ✅ 正确：每次创建新实例
const runPatternValidation = (text, diags) => {
  const patternValidator = new PatternValidator();  // 新实例
  patternValidator.validate(text);
};
```

2. **不捕获验证异常**
```typescript
// ❌ 错误：异常会导致扩展崩溃
const errors = patternValidator.validate(text);

// ✅ 正确：捕获所有异常
try {
  const errors = patternValidator.validate(text);
} catch (e) {
  // 验证错误是预期的
}
```

3. **使用 console.log 调试**
```typescript
// ❌ 错误：生产环境不应有 console 输出
console.log(`Found ${errors.length} errors`);
errors.forEach(e => console.log(e));

// ✅ 正确：直接处理错误
for (const error of errors) {
  diags.push(/* 创建诊断 */);
}
```

4. **不使用 parser.getErrors()**
```typescript
// ❌ 错误：丢失解析错误
const parser = new Parser(text);
const ast = parser.parse();  // 解析错误被忽略

// ✅ 正确：收集解析错误
const parser = new Parser(text);
const ast = parser.parse();
const parserErrors = parser.getErrors();  // 获取所有解析错误
```

5. **忘记处理参数表达式中的变量使用**
```typescript
// ❌ 错误：在签名检查后验证参数（导致用户定义函数的参数未被标记为已使用）
private validateCallExpression(call: CallExpression): void {
  this.validateExpression(call.callee);

  const signature = this.functionSignatures.get(functionName);
  if (!signature) {
    return;  // 提前返回，参数未被验证！
  }

  // 验证参数（但用户定义函数永远到不了这里）
  for (const arg of call.arguments) {
    this.validateExpression(arg.value);
  }
}

// ✅ 正确：在签名检查前验证参数
private validateCallExpression(call: CallExpression): void {
  this.validateExpression(call.callee);

  // 始终验证参数表达式（标记变量为已使用）
  for (const arg of call.arguments) {
    this.validateExpression(arg.value);
  }

  const signature = this.functionSignatures.get(functionName);
  if (!signature) {
    return;  // 现在可以安全返回了
  }

  // 验证签名
  this.validateFunctionArguments(call, functionName, signature);
}
```

## 位置信息处理

### Position 和 Range
VSCode 的 Position 和 Range 是 0-indexed：

```typescript
// Lexer/Parser 使用 1-indexed
error.line = 5, error.column = 10

// 转换为 VSCode Position (0-indexed)
const pos = new vscode.Position(error.line - 1, error.column - 1);  // (4, 9)
```

### 计算 Range
```typescript
// 方法 1: 使用长度
const pos = new vscode.Position(line - 1, column - 1);
const endPos = pos.translate(0, error.length);  // 向右移动 length 列
const range = new vscode.Range(pos, endPos);

// 方法 2: 使用 match 索引
const pos = doc.positionAt(match.index);  // 自动转换
const endPos = pos.translate(0, match[0].length);
```

### DiagnosticTag
为特定类型的诊断添加标签：

```typescript
const diag = new vscode.Diagnostic(/* ... */);

// 标记为"未使用"（灰色显示）
diag.tags = [vscode.DiagnosticTag.Unnecessary];

// 标记为"已弃用"（删除线）
diag.tags = [vscode.DiagnosticTag.Deprecated];
```

## 扩展性

### 向 PatternValidator 添加新规则

在 `src/parser/patternValidator.ts` 中的 `validate()` 方法添加新的检查逻辑：

```typescript
export class PatternValidator {
  validate(text: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // ... 现有验证逻辑 ...

    // 添加新的自定义检查
    this.checkCustomRule(text, errors);

    return errors;
  }

  private checkCustomRule(text: string, errors: ValidationError[]): void {
    // 实现自定义验证规则
    const pattern = /your_pattern/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      errors.push({
        line: this.getLineNumber(text, match.index),
        column: this.getColumnNumber(text, match.index),
        length: match[0].length,
        message: 'Your error message',
        severity: vscode.DiagnosticSeverity.Warning
      });
    }
  }
}
```

### 向 AstValidator 添加新的语义检查

在 `src/parser/astValidator.ts` 中添加新的验证方法：

```typescript
export class AstValidator {
  validate(ast: Program): ValidationError[] {
    // ... 现有逻辑 ...

    // 添加新的语义检查
    this.checkCustomSemantics(ast);

    return this.errors;
  }

  private checkCustomSemantics(ast: Program): void {
    // 遍历 AST 执行自定义检查
    for (const node of ast.body) {
      if (node.type === 'YourNodeType') {
        // 执行检查逻辑
      }
    }
  }
}
```

## 性能考虑

### 1. 正则表达式优化
```typescript
// ❌ 低效：多次调用 getText()
const text1 = doc.getText();
const text2 = doc.getText();
const text3 = doc.getText();

// ✅ 高效：缓存文本
const text = doc.getText();
if (/pattern1/.test(text) && /pattern2/.test(text)) {
  // ...
}
```

### 2. 避免重复创建验证器实例
```typescript
// ❌ 低效：在循环中创建
for (const doc of documents) {
  const validator = new PatternValidator();  // 每次都创建
  validator.validate(doc.getText());
}

// ✅ 高效：在函数调用时创建一次
const runPatternValidation = (text: string, diags: vscode.Diagnostic[]): void => {
  const patternValidator = new PatternValidator();  // 只创建一次
  const errors = patternValidator.validate(text);
  // ...
};
```

### 3. 提前返回
```typescript
const runDiagnostics = (doc: vscode.TextDocument) => {
  if (doc.languageId !== 'pine') return;  // 提前返回
  // ...
};
```

## 测试建议

### PatternValidator 单元测试
```typescript
describe('PatternValidator', () => {
  it('should detect invalid parameters', () => {
    const validator = new PatternValidator();
    const code = 'plot(close, invalid_param=true)';
    const errors = validator.validate(code);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('invalid_param');
  });

  it('should not crash on malformed code', () => {
    const validator = new PatternValidator();
    const code = 'plot(((((';

    expect(() => {
      validator.validate(code);
    }).not.toThrow();
  });
});
```

### AstValidator 单元测试
```typescript
describe('AstValidator', () => {
  it('should detect unused variables', () => {
    const code = `
      //@version=5
      indicator("Test")
      unused_var = 1
      x = 2
      plot(x)
    `;
    const parser = new Parser(code);
    const ast = parser.parse();
    const validator = new AstValidator();
    const errors = validator.validate(ast);

    const unusedErrors = errors.filter(e => e.type === ErrType.Unused);
    expect(unusedErrors.length).toBe(1);
    expect(unusedErrors[0].message).toContain('unused_var');
  });

  it('should mark variables used in function arguments', () => {
    const code = `
      //@version=5
      indicator("Test")
      value = close
      detect(value, 14)
    `;
    const parser = new Parser(code);
    const ast = parser.parse();
    const validator = new AstValidator();
    const errors = validator.validate(ast);

    const unusedErrors = errors.filter(e =>
      e.type === ErrType.Unused && e.message.includes('value')
    );
    expect(unusedErrors.length).toBe(0);  // value 应该被标记为已使用
  });
});
```

### 集成测试
```typescript
describe('runDiagnostics', () => {
  it('should combine both validators', () => {
    const doc = createMockDocument(`
      //@version=5
      indicator("Test")
      unused = 1
      plot(close, invalid_param=true)
    `);

    runDiagnostics(doc);
    const diags = diagCollection.get(doc.uri);

    // 应该有两个错误：unused variable + invalid parameter
    expect(diags.length).toBeGreaterThanOrEqual(2);
  });
});
```

## 总结

Pine Script v6 验证系统遵循以下原则：

1. ✅ **双层架构**:
   - **PatternValidator**: 基于正则的快速验证（函数参数、命名空间）
   - **AstValidator**: 基于 AST 的深度验证（未使用变量、类型检查）

2. ✅ **职责分离**:
   - PatternValidator 负责语法级别的快速检查
   - AstValidator 负责语义级别的深度分析

3. ✅ **可靠性**:
   - 完善的异常处理，避免扩展崩溃
   - 正确处理解析错误（parser.getErrors()）

4. ✅ **正确性**:
   - 参数验证在签名检查前执行，确保所有变量使用都被追踪
   - 解构变量位置精确追踪（DestructuringVariable）
   - 函数参数位置精确追踪

5. ✅ **可维护性**:
   - 清晰的命名（PatternValidator、AstValidator）
   - 模块化设计，代码复用
   - 完善的文档和注释

6. ✅ **可扩展性**:
   - 易于添加新规则和验证器
   - 支持自定义验证逻辑

7. ✅ **性能**:
   - PatternValidator 提供毫秒级快速验证
   - 缓存文本避免重复读取
   - 提前返回减少不必要的计算

8. ✅ **无状态**:
   - 每次验证创建新实例，避免状态污染

遵循这些注意事项，可以确保验证系统稳定可靠、易于维护和扩展。

## 关键 Bug 修复记录

### 1. 变量在函数参数中使用未被标记（已修复）
**问题**: 用户定义函数的参数中使用的变量被报告为"未使用"。

**原因**: 在 `AstValidator.validateCallExpression()` 中，参数表达式验证在签名检查之后。对于用户定义的函数（无签名），方法提前返回，参数表达式未被验证。

**修复**: 将参数表达式验证移到签名检查之前，确保所有函数调用的参数都被验证。

参见：`src/parser/astValidator.ts:702-734`

### 2. 解构变量位置不准确（已修复）
**问题**: 解构赋值中的所有变量都指向左括号位置，而不是变量名位置。

**原因**: `DestructuringAssignment` 节点只存储变量名数组，不存储每个变量的位置信息。

**修复**: 添加 `DestructuringVariable` 接口存储每个变量的 line/column 信息。

参见：`src/parser/ast.ts:DestructuringVariable`、`src/parser/parser.ts`

### 3. 函数参数位置不准确（已修复）
**问题**: 参数的"Go to Definition"跳转到函数名位置，而不是参数位置。

**原因**: 参数符号使用函数声明的位置。

**修复**: 在解析函数声明时捕获每个参数的 token 位置。

参见：`src/parser/parser.ts:parseFunctionDeclaration()`
