# Pine Script v6 词法器实现注意事项

## 概述

本文档说明 Pine Script v6 词法器的实现要点、关键设计决策和需要注意的事项。

## 核心架构

### 单遍扫描设计
- 使用经典的单遍词法分析，O(n) 时间复杂度
- 维护三个关键状态：`pos`（位置）、`line`（行号）、`column`（列号）
- 每个 token 类型有专门的扫描方法，职责单一

### 位置跟踪
所有位置信息采用 **1-indexed**（从 1 开始计数）：
```typescript
line: number;    // 行号，从 1 开始
column: number;  // 列号，从 1 开始
endLine: number;   // 结束行号
endColumn: number; // 结束列号
```

⚠️ **重要**：遇到换行符时，列号必须重置为 1，而不是 0：
```typescript
if (char === '\n') {
  this.line++;
  this.column = 1;  // 不是 0！
}
```

### 缩进处理
- 缩进级别记录在每个 token 上：`indent?: number`
- 所有同一行的 token 共享相同的 `indent` 值
- Tab 宽度可配置，默认为 4 个空格
```typescript
const lexer = new Lexer(source, { tabWidth: 8 });
```

## Token 类型说明

### 基本字面量
- `NUMBER`: 支持整数、浮点数、科学计数法（1.5e10, 2.5e-5）
- `STRING`: 支持单引号和双引号，处理转义序列，允许多行
- `BOOL`: `true` 和 `false`
- `COLOR`: 十六进制颜色 `#RRGGBB` 或 `#RRGGBBAA`

### 关键字处理
所有关键字统一识别为 `KEYWORD` 类型，包括：
- 控制流：`if`, `else`, `for`, `while`, `break`, `continue`, `return`
- 声明修饰符：`var`, `varip`, `const`
- 类型：`int`, `float`, `bool`, `string`, `color` 等
- 逻辑运算符：`and`, `or`, `not`（注意：没有 LOGICAL token 类型）
- 特殊：`na`（表示 "not available"）

⚠️ **注意**：`na` 是 KEYWORD，不是 BOOL 或字面量

### 运算符
- 单字符运算符通过 `SINGLE_CHAR_TOKENS` Map 统一管理
- 多字符运算符需要前瞻判断：`==`, `!=`, `<=`, `>=`, `:=`, `=>`

### 注释
- 单行注释：`//` 开头
- 块注释：`/* ... */`，可跨行
- 特殊注解：`//@version=6` 识别为 `ANNOTATION` 类型

## 关键实现细节

### 1. 数字扫描的前瞻逻辑
小数点后必须是数字才识别为浮点数，避免与成员访问混淆：
```typescript
// 正确：3.14 是浮点数
// 正确：obj.method 不会被误识别
if (this.peek() === '.' && this.isDigit(this.peekNext())) {
  // 处理小数部分
}
```

### 2. 字符串的转义处理
```typescript
if (char === '\\') {
  this.advance();  // 消费反斜杠
  if (!this.isAtEnd()) {
    this.advance();  // 消费被转义的字符
  }
}
```

### 3. 颜色字面量的降级策略
无效的十六进制颜色会降级为 IDENTIFIER，实现错误恢复：
```typescript
if (hexCount === 6 || hexCount === 8) {
  this.addToken(TokenType.COLOR, value, value.length);
} else {
  // 降级为 IDENTIFIER，继续扫描
  this.addToken(TokenType.IDENTIFIER, value, value.length);
}
```

### 4. 单字符 Token 映射
使用 Map 简化代码，提高可维护性：
```typescript
const SINGLE_CHAR_TOKENS = new Map<string, TokenType>([
  ['(', TokenType.LPAREN],
  [')', TokenType.RPAREN],
  // ... 其他单字符 token
]);

// 在 scanToken() 中优先检查
const singleCharType = SINGLE_CHAR_TOKENS.get(char);
if (singleCharType) {
  this.addToken(singleCharType, char, 1);
  return;
}
```

### 5. 多行 Token 的位置记录
字符串和块注释可能跨越多行，需要特殊处理：
```typescript
private scanString(quote: string): void {
  const startLine = this.line;
  const startColumn = this.column - 1;

  // ... 扫描字符串内容 ...

  // 使用专门的方法记录跨行位置
  this.addTokenWithPosition(
    TokenType.STRING,
    value,
    startLine,
    startColumn,
    this.line,
    this.column
  );
}
```

## 错误处理

### 错误收集机制
词法器会收集所有遇到的错误，而不是立即中断：
```typescript
interface LexerError {
  message: string;
  line: number;
  column: number;
  length: number;
}

// 使用方式
const lexer = new Lexer(source);
lexer.tokenize();
const errors = lexer.getErrors();
```

### 错误 Token
遇到无法识别的字符时生成 `ERROR` token：
```typescript
case '!':
  if (this.peek() === '=') {
    this.addToken(TokenType.COMPARE, '!=', 2);
  } else {
    // Pine Script 使用 'not' 关键字，不支持单独的 !
    this.reportError("Unexpected character '!'. Pine Script uses 'not' keyword instead.", 1);
    this.addToken(TokenType.ERROR, '!', 1);
  }
  break;
```

## 常见陷阱

### ❌ 错误实践

1. **列号从 0 开始**
```typescript
// 错误
this.column = 0;  // 应该是 1
```

2. **缩进逻辑反了**
```typescript
// 错误
indent: this.atLineStart ? undefined : this.currentIndent

// 正确
indent: this.currentIndent
```

3. **忘记处理多行 token 的行号更新**
```typescript
// 错误：扫描字符串时忘记更新 line
if (char === '\n') {
  this.advance();  // 缺少 this.line++
}
```

4. **静默忽略错误字符**
```typescript
// 错误：单独的 ! 被忽略
case '!':
  if (this.peek() === '=') {
    // ...
  }
  break;  // 什么都不做

// 正确：报告错误
case '!':
  if (this.peek() === '=') {
    // ...
  } else {
    this.reportError(...);
    this.addToken(TokenType.ERROR, '!', 1);
  }
  break;
```

## 性能考虑

### ✅ 已优化的点
1. **单字符 token 映射**：使用 Map 避免冗长的 switch 语句
2. **前瞻操作**：`peek()` 和 `peekNext()` 避免回溯
3. **substring 提取**：每个 token 只调用一次 `substring()`

### 无需优化的点
1. **字符比较 vs charCodeAt**：现代 JS 引擎已优化，差异微小
2. **数组预分配**：会增加复杂度，收益不明显

## 扩展性

### 添加新的单字符 token
只需在 Map 中添加映射：
```typescript
const SINGLE_CHAR_TOKENS = new Map<string, TokenType>([
  // ... 现有映射 ...
  ['@', TokenType.AT],  // 添加新的
]);
```

### 添加新的关键字
在 `KEYWORDS` Set 中添加即可：
```typescript
const KEYWORDS = new Set([
  // ... 现有关键字 ...
  'newkeyword',
]);
```

### 添加新的多字符运算符
在 `scanToken()` 的 switch 中添加前瞻判断：
```typescript
case '&':
  if (this.peek() === '&') {
    this.advance();
    this.addToken(TokenType.AND, '&&', 2);
  } else {
    this.addToken(TokenType.BITWISE_AND, '&', 1);
  }
  break;
```

## 测试建议

### 必须测试的场景
1. **边界情况**：空文件、只有空白、只有注释
2. **位置信息**：行号、列号、length 的准确性
3. **多行 token**：跨行字符串、块注释
4. **错误恢复**：无效的颜色、未闭合的字符串
5. **缩进**：tab/space 混用、不同 tab 宽度
6. **转义序列**：`\n`, `\t`, `\"`, `\'`
7. **科学计数法**：正负指数、大小写 E

### 测试工具
```bash
npm run test:lexer        # 运行词法器测试
npm run test:samples      # 测试实际样例文件
node test-lexer-enhancements.js  # 测试增强功能
```

## 总结

Pine Script v6 词法器的实现遵循以下原则：

1. ✅ **正确性优先**：位置信息准确、错误处理完善
2. ✅ **简洁清晰**：职责分离、避免复杂逻辑
3. ✅ **易于维护**：使用 Map/Set 简化映射、注释充分
4. ✅ **良好的错误恢复**：遇到错误继续扫描，收集所有问题
5. ✅ **可配置性**：支持 tab 宽度等选项

遵循这些注意事项，可以确保词法器稳定可靠，适合生产环境使用。
