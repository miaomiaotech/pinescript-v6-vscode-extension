# Pine Script v6 Parser 实现注意事项

## 概述

本文档说明 Pine Script v6 parser 的实现要点、关键设计决策和需要注意的事项。Parser 基于递归下降算法，采用缩进敏感的语法分析。

## 核心架构

### 递归下降解析
- 使用经典的递归下降解析器设计
- 每个语法结构有对应的解析方法
- 自顶向下构建 AST (Abstract Syntax Tree)
- 支持错误恢复和继续解析

### Token 过滤
Parser 在构造时会过滤掉不需要的 token：
```typescript
this.tokens = lexer.tokenize().filter(t =>
  t.type !== TokenType.WHITESPACE &&
  t.type !== TokenType.COMMENT
);
```

⚠️ **注意**: NEWLINE token **不会**被过滤，因为在缩进敏感的解析中需要用它来判断是否跨行。

### 缩进敏感解析
Pine Script 使用缩进来定义代码块，类似 Python：
```pine
if condition
    statement1  // 4 spaces indent
    statement2
else
    statement3
```

核心方法 `parseIndentedBlock()` 用于解析所有缩进块：
```typescript
private parseIndentedBlock(startToken: Token): AST.Statement[] {
  const body: AST.Statement[] = [];
  let blockIndent: number | null = null;

  while (!this.isAtEnd()) {
    const currentToken = this.peek();
    const currentIndent = currentToken.indent ?? 0;

    // Skip NEWLINE tokens
    if (currentToken.type === TokenType.NEWLINE) {
      this.advance();
      continue;
    }

    // Set expected block indentation from first statement
    if (blockIndent === null && currentToken.line > startToken.line) {
      blockIndent = currentIndent;
    }

    // Stop if indentation decreased
    if (blockIndent !== null && currentToken.line > startToken.line && currentIndent < blockIndent) {
      break;
    }

    const stmt = this.statement();
    if (stmt) body.push(stmt);
    else break;
  }

  return body;
}
```

## 错误处理

### 错误收集机制
Parser 会收集所有遇到的错误，而不是在第一个错误处停止：
```typescript
interface ParserError {
  message: string;
  line: number;
  column: number;
  token?: Token;
}

// 使用方式
const parser = new Parser(source);
const ast = parser.parse();
const errors = parser.getErrors();
```

### 错误恢复（Synchronization）
当解析失败时，`synchronize()` 方法会跳过 token 直到找到下一个语句的开始：
```typescript
private synchronize(): void {
  this.advance();

  while (!this.isAtEnd()) {
    // Look for statement boundaries
    switch (this.peek().type) {
      case TokenType.KEYWORD:
        if (['if', 'for', 'while', 'var', 'varip', 'const'].includes(this.peek().value)) {
          return;
        }
        break;
    }

    this.advance();
  }
}
```

### try-catch 模式
在 `parse()` 方法中使用 try-catch 捕获错误：
```typescript
while (!this.isAtEnd()) {
  try {
    const stmt = this.statement();
    if (stmt) body.push(stmt);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    this.reportError(errorMsg);
    this.synchronize();
  }
}
```

## 常量和复用

### 类型关键字
所有类型相关的关键字定义为常量，避免重复：
```typescript
const TYPE_KEYWORDS = ['int', 'float', 'bool', 'string', 'color', 'line', 'label',
                       'box', 'table', 'array', 'matrix', 'map'] as const;

const TYPE_QUALIFIERS = ['series', 'simple', 'input', 'const'] as const;
```

使用时展开数组：
```typescript
if (this.check([TokenType.KEYWORD, [...TYPE_KEYWORDS]])) {
  // ...
}
```

### 共用解析方法
所有需要解析缩进块的地方都使用 `parseIndentedBlock()`：
- `ifStatement()` - if 和 else 分支
- `forStatement()` - for 循环体
- `whileStatement()` - while 循环体
- `functionDeclaration()` - 函数体（多行情况）

## 位置信息处理

### tokenRange 优化
优先使用 lexer 提供的 `endLine`/`endColumn`，支持多行 token：
```typescript
private tokenRange(token: Token): Range {
  // Use endLine/endColumn if available (for multi-line tokens)
  if (token.endLine !== undefined && token.endColumn !== undefined) {
    const start = new Position(token.line - 1, token.column - 1);
    const end = new Position(token.endLine - 1, token.endColumn - 1);
    return new Range(start, end);
  }
  // Fallback to calculating from length
  const start = new Position(token.line - 1, token.column - 1);
  const end = new Position(token.line - 1, (token.column - 1) + token.value.length);
  return new Range(start, end);
}
```

⚠️ **注意**: VSCode 的 Position 是 0-indexed，而 lexer 的 line/column 是 1-indexed，需要减 1。

### endToken 计算
简化 endToken 的计算逻辑：
```typescript
// ✅ 好的做法
const endToken = body.length > 0 ? this.previous() : this.tokens[this.current - 1];

// ❌ 避免复杂的嵌套三元表达式
const endToken = body.length > 0 ? this.previous() :
  to.range.end.isAfter(from.range.end) ? this.previous() :
  this.tokens[this.tokens.indexOf(this.previous())];
```

## 表达式优先级

Parser 按照标准的运算符优先级顺序解析表达式：

1. `primary()` - 字面量、标识符、括号表达式
2. `postfix()` - 函数调用、成员访问、数组索引
3. `unary()` - 一元运算符（`-`、`not`）
4. `multiplication()` - `*`、`/`、`%`
5. `addition()` - `+`、`-`
6. `comparison()` - `==`、`!=`、`<`、`>`、`<=`、`>=`
7. `logicalAnd()` - `and`
8. `logicalOr()` - `or`
9. `ternary()` - `? :`
10. `expression()` - 入口

⚠️ **注意**: 优先级从下往上递增，每层调用下一层。

## 关键实现细节

### 1. 回溯（Backtracking）
某些情况需要回溯来确定语句类型：

```typescript
// 尝试解析函数声明
const funcDeclCheckpoint = this.current;
let isExport = false;
if (this.match([TokenType.KEYWORD, ['export']])) {
  isExport = true;
}

if (this.check(TokenType.IDENTIFIER)) {
  const nameToken = this.advance();
  if (this.match(TokenType.LPAREN)) {
    try {
      // 尝试解析函数参数和 =>
      // ...
    } catch (e) {
      // 不是函数声明，回溯
      this.current = funcDeclCheckpoint;
    }
  } else {
    this.current = funcDeclCheckpoint;
  }
}
```

### 2. 命名参数解析
Pine Script 允许关键字作为参数名：
```typescript
// 允许 KEYWORD 作为参数名
if ((this.check(TokenType.IDENTIFIER) || this.check(TokenType.KEYWORD))
    && this.peekNext()?.type === TokenType.ASSIGN) {
  const name = this.advance().value;
  this.advance(); // consume =
  const value = this.expression();
  args.push({ name, value });
}
```

### 3. 成员访问的属性名
属性名也可以是关键字：
```typescript
// input.float - 'float' 是关键字但可以作为属性名
if (this.check(TokenType.IDENTIFIER)) {
  property = this.advance();
} else if (this.check(TokenType.KEYWORD)) {
  property = this.advance();  // 允许关键字作为属性名
}
```

### 4. 函数体解析
函数体可以是单行或多行：
```typescript
// 单行: f(x) => x * 2
// 多行:
// f(x) =>
//     y = x * 2
//     y + 1

const nextToken = this.peek();
if (nextToken.type !== TokenType.NEWLINE && nextToken.line === startToken.line) {
  // 单行函数
  const expr = this.expression();
  body.push({
    type: 'ReturnStatement',
    value: expr,
    // ...
  });
} else {
  // 多行函数
  body.push(...this.parseIndentedBlock(startToken));
}
```

### 5. 解构赋值
Pine Script 支持数组解构赋值，用于函数返回多个值：
```pine
[kdj_top, kdj_bottom] = detect_high_low(k_value, 80, 20, 50, true)
```

实现使用回溯模式识别解构赋值：
```typescript
// Check for destructuring assignment: [name1, name2] = expr
if (this.check(TokenType.LBRACKET)) {
  const checkpoint = this.current;
  try {
    this.advance(); // consume [

    // Try to parse identifier list
    const names: string[] = [];
    if (!this.check(TokenType.RBRACKET)) {
      do {
        if (this.check(TokenType.IDENTIFIER)) {
          names.push(this.advance().value);
        } else {
          throw new Error('Expected identifier in destructuring pattern');
        }
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RBRACKET, 'Expected "]" in destructuring pattern');

    // Check for = after the pattern
    if (this.match(TokenType.ASSIGN)) {
      // This is a destructuring assignment!
      return this.destructuringAssignment(names, startToken);
    }

    // Not a destructuring assignment, backtrack
    this.current = checkpoint;
  } catch (e) {
    // Not a destructuring assignment, backtrack
    this.current = checkpoint;
  }
}
```

⚠️ **注意**: 解构赋值必须在数组字面量检测之前，否则会被误认为数组表达式。

## 常见陷阱

### ❌ 错误实践

1. **过滤掉 NEWLINE token**
```typescript
// 错误：过滤 NEWLINE 会导致缩进解析失败
this.tokens = lexer.tokenize().filter(t =>
  t.type !== TokenType.NEWLINE  // ❌
);
```

2. **不处理 undefined indent**
```typescript
// 错误：直接使用可能是 undefined 的 indent
const currentIndent = currentToken.indent;  // ❌ 可能 undefined

// 正确：使用默认值
const currentIndent = currentToken.indent ?? 0;  // ✅
```

3. **复杂的 endToken 计算**
```typescript
// 错误：过于复杂的嵌套三元表达式
const endToken = body.length > 0 ? this.previous() :
  to.range.end.isAfter(from.range.end) ? this.previous() :
  this.tokens[this.tokens.indexOf(this.previous())];  // ❌

// 正确：简洁明了
const endToken = body.length > 0 ? this.previous() : this.tokens[this.current - 1];  // ✅
```

4. **忘记跳过 NEWLINE**
```typescript
// 错误：parseIndentedBlock 中不跳过 NEWLINE
while (!this.isAtEnd()) {
  const stmt = this.statement();  // ❌ 会尝试解析 NEWLINE
  // ...
}

// 正确：显式跳过
while (!this.isAtEnd()) {
  if (this.peek().type === TokenType.NEWLINE) {
    this.advance();
    continue;  // ✅
  }
  const stmt = this.statement();
  // ...
}
```

5. **使用 console.error 而不是收集错误**
```typescript
// 错误：直接打印到控制台
console.error(`Error: ${errorMsg}`);  // ❌

// 正确：收集错误供调用者处理
this.reportError(errorMsg);  // ✅
```

## 测试建议

### 必须测试的场景
1. **基本语句**: 变量声明、赋值、表达式
2. **解构赋值**: 数组解构、多个变量同时赋值
3. **控制流**: if/else、for、while
4. **函数**: 声明、调用、命名参数
5. **表达式**: 运算符优先级、嵌套调用
6. **缩进**: 正确的缩进块、缩进变化
7. **错误恢复**: 语法错误后继续解析
8. **边界情况**: 空程序、只有注释、单行函数

### 测试工具
```bash
npm run test:parser      # 运行 parser 测试
npm run test             # 运行所有测试
```

## 优化后的改进

### 代码简化
- **删除了 ~150 行重复的缩进处理代码**
- 使用 `parseIndentedBlock()` 统一处理
- 提取常量避免重复定义

### 错误处理增强
- 添加 `ParserError` 接口和 `getErrors()` 方法
- 替换 `console.error` 为 `reportError()`
- 所有错误都可被收集和处理

### 位置信息优化
- 支持多行 token 的 `endLine`/`endColumn`
- 简化 `endToken` 计算逻辑
- 更准确的 Range 信息

### 可维护性提升
- 类型关键字集中定义
- 公共方法复用
- 代码结构更清晰

## 扩展性

### 添加新的语句类型
1. 在 `statement()` 中添加匹配逻辑
2. 实现对应的解析方法
3. 如果需要缩进块，使用 `parseIndentedBlock()`

示例：
```typescript
// 在 statement() 中
if (this.match([TokenType.KEYWORD, ['switch']])) {
  const startToken = this.previous();
  return this.switchStatement(startToken);
}

// 实现解析方法
private switchStatement(startToken: Token): AST.SwitchStatement {
  const condition = this.expression();
  const cases = this.parseSwitchCases(startToken);
  // ...
}
```

### 添加新的表达式类型
在相应优先级的方法中添加处理逻辑：
```typescript
private multiplication(): AST.Expression {
  let expr = this.unary();

  while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO, TokenType.POWER)) {  // 添加 POWER
    const operator = this.previous().value;
    const right = this.unary();
    expr = { /* ... */ };
  }

  return expr;
}
```

## 总结

Pine Script v6 Parser 的实现遵循以下原则：

1. ✅ **正确性优先**: 准确解析语法、缩进敏感
2. ✅ **错误恢复**: 遇到错误继续解析，收集所有问题
3. ✅ **代码复用**: 提取公共方法，避免重复
4. ✅ **清晰明了**: 简化复杂逻辑，提高可读性
5. ✅ **易于扩展**: 模块化设计，方便添加新语法

遵循这些注意事项，可以确保 parser 稳定可靠，适合生产环境使用。
