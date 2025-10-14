# Pine Script v6 验证系统实现注意事项

## 概述

本文档说明 Pine Script v6 验证系统（runDiagnostics）的实现要点和关键设计决策。

## 架构设计

### 分层验证策略
验证系统采用三层验证架构，每层负责不同类型的检查：

```typescript
const runDiagnostics = (doc: vscode.TextDocument) => {
  if (doc.languageId !== 'pine') return;
  const diags: vscode.Diagnostic[] = [];

  // 三层验证
  runAccurateValidation(text, diags);        // 1. 函数参数验证
  runComprehensiveValidation(text, diags);   // 2. AST 语义验证
  runPatternValidation(doc, diags);          // 3. 正则模式验证

  diagCollection.set(doc.uri, diags);
};
```

### 1. AccurateValidator - 函数参数验证
验证内置函数的参数使用是否正确：

```typescript
const runAccurateValidation = (text: string, diags: vscode.Diagnostic[]): void => {
  try {
    const accurateValidator = new AccurateValidator();  // ⚠️ 每次创建新实例
    const errors = accurateValidator.validate(text);

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

⚠️ **关键点**:
- 每次创建新的 validator 实例，避免状态污染
- 捕获所有异常，防止扩展崩溃
- 不使用 console.log/error（生产环境）

### 2. ComprehensiveValidator - AST 语义验证
基于 AST 的深度语义分析：

```typescript
const runComprehensiveValidation = (text: string, diags: vscode.Diagnostic[]): void => {
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
    const validator = new ComprehensiveValidator();
    const comprehensiveErrors = validator.validate(ast);
    for (const error of comprehensiveErrors) {
      if (error.type !== ErrType.Unused) continue;

      const diag = new vscode.Diagnostic(/* ... */);
      diag.tags = [vscode.DiagnosticTag.Unnecessary];  // 标记为"未使用"
      diags.push(diag);
    }
  } catch (e) {
    // 解析错误已通过 getErrors() 收集
  }
};
```

⚠️ **关键点**:
- 必须使用 `parser.getErrors()` 获取解析错误
- 为未使用变量添加 `DiagnosticTag.Unnecessary`
- 不要依赖 catch 块处理解析错误

### 3. PatternValidation - 正则模式验证
基于正则表达式的模式匹配验证：

```typescript
const runPatternValidation = (doc: vscode.TextDocument, diags: vscode.Diagnostic[]): void => {
  // 11 种验证规则
  // 使用辅助函数简化代码
};
```

## 辅助函数

### findAndDiagnose - 单次匹配
用于只需要找到第一个匹配的场景：

```typescript
const findAndDiagnose = (
  doc: vscode.TextDocument,
  regex: RegExp,
  message: string,
  severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning
): vscode.Diagnostic | null => {
  const text = doc.getText();
  const match = regex.exec(text);
  if (!match) return null;

  const pos = doc.positionAt(match.index);
  const endPos = pos.translate(0, Math.max(1, match[0].length));
  return new vscode.Diagnostic(new vscode.Range(pos, endPos), message, severity);
};
```

**使用示例**:
```typescript
// 检查是否使用了不存在的函数
const mathClampDiag = findAndDiagnose(
  doc,
  /\bmath\.clamp\b/,
  'Pine v6: use math.min/math.max pattern; math.clamp is not available.'
);
if (mathClampDiag) diags.push(mathClampDiag);
```

### findAllAndDiagnose - 多次匹配
用于需要找到所有匹配的场景：

```typescript
const findAllAndDiagnose = (
  doc: vscode.TextDocument,
  regex: RegExp,
  callback: (match: RegExpExecArray, doc: vscode.TextDocument) => vscode.Diagnostic | null
): vscode.Diagnostic[] => {
  const text = doc.getText();
  const diags: vscode.Diagnostic[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const diag = callback(match, doc);
    if (diag) diags.push(diag);
  }

  return diags;
};
```

**使用示例**:
```typescript
// 检查所有 plotshape 调用
diags.push(...findAllAndDiagnose(
  doc,
  /plotshape\s*\([^)]*\bshape\s*=/g,
  (match, doc) => {
    const shapeIndex = match[0].indexOf('shape=');
    const pos = doc.positionAt(match.index + shapeIndex);
    const endPos = pos.translate(0, 6);
    return new vscode.Diagnostic(
      new vscode.Range(pos, endPos),
      'Invalid parameter "shape". Did you mean "style"?',
      vscode.DiagnosticSeverity.Error
    );
  }
));
```

## 验证规则列表

当前实现的 11 种模式验证规则：

| # | 规则 | 描述 | 严重性 |
|---|------|------|--------|
| 1 | Version header | 检查 `//@version=6` | Warning |
| 2 | input.timeframe | 建议使用 `input.timeframe` | Warning |
| 3 | time() session | `not na(time(...))` 用法 | Warning |
| 4 | ta.change | 条件中的使用建议 | Warning |
| 5 | timenow | 毫秒单位提醒 | Warning |
| 6 | math.clamp | 不存在的函数 | Warning |
| 7 | plotshape shape= | 应该用 `style=` | Error |
| 8 | plotchar shape= | 应该用 `char=` | Error |
| 9 | timeframe_gaps | 需要 `timeframe` 参数 | Warning |
| 10 | alertcondition | 参数数量检查 | Error |
| 11 | input.string() | 缺少必需参数 | Error |

## 常见陷阱

### ❌ 错误实践

1. **使用单例 Validator**
```typescript
// ❌ 错误：可能导致状态污染
const accurateValidator = new AccurateValidator();

const runDiagnostics = (doc) => {
  accurateValidator.validate(text);  // 复用同一实例
};

// ✅ 正确：每次创建新实例
const runAccurateValidation = (text, diags) => {
  const accurateValidator = new AccurateValidator();  // 新实例
  accurateValidator.validate(text);
};
```

2. **不捕获验证异常**
```typescript
// ❌ 错误：异常会导致扩展崩溃
const errors = accurateValidator.validate(text);

// ✅ 正确：捕获所有异常
try {
  const errors = accurateValidator.validate(text);
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

5. **正则表达式不使用 /g 标志**
```typescript
// ❌ 错误：findAllAndDiagnose 需要全局匹配
findAllAndDiagnose(doc, /pattern/, callback);  // 只匹配一次

// ✅ 正确：使用 /g 标志
findAllAndDiagnose(doc, /pattern/g, callback);  // 匹配所有
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

### 添加新的模式验证规则

在 `runPatternValidation()` 中添加：

```typescript
const runPatternValidation = (doc: vscode.TextDocument, diags: vscode.Diagnostic[]): void => {
  // ... 现有规则 ...

  // 12) 新规则：检查 strategy.exit 的使用
  diags.push(...findAllAndDiagnose(
    doc,
    /strategy\.exit\s*\([^)]*\)/g,
    (match, doc) => {
      // 自定义验证逻辑
      if (/* 条件 */) {
        const pos = doc.positionAt(match.index);
        return new vscode.Diagnostic(
          new vscode.Range(pos, pos.translate(0, 13)),
          'Message',
          vscode.DiagnosticSeverity.Warning
        );
      }
      return null;
    }
  ));
};
```

### 创建新的验证器

如果需要新的验证层：

```typescript
const runCustomValidation = (
  doc: vscode.TextDocument,
  diags: vscode.Diagnostic[]
): void => {
  // 自定义验证逻辑
};

const runDiagnostics = (doc: vscode.TextDocument) => {
  // ...
  runCustomValidation(doc, diags);  // 添加新验证层
  diagCollection.set(doc.uri, diags);
};
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

### 2. 条件验证
```typescript
// 只在必要时执行昂贵的正则匹配
const timeframeDiag = findAndDiagnose(doc, /complex_regex/, 'Message');
if (timeframeDiag && !someOtherCondition) {  // 先检查简单条件
  diags.push(timeframeDiag);
}
```

### 3. 提前返回
```typescript
const runDiagnostics = (doc: vscode.TextDocument) => {
  if (doc.languageId !== 'pine') return;  // 提前返回
  // ...
};
```

## 测试建议

### 单元测试结构
```typescript
describe('runAccurateValidation', () => {
  it('should detect invalid parameters', () => {
    const diags: vscode.Diagnostic[] = [];
    const code = 'plot(close, invalid_param=true)';
    runAccurateValidation(code, diags);

    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].message).toContain('invalid_param');
  });

  it('should not crash on malformed code', () => {
    const diags: vscode.Diagnostic[] = [];
    const code = 'plot(((((';

    expect(() => {
      runAccurateValidation(code, diags);
    }).not.toThrow();
  });
});
```

### 集成测试
```typescript
describe('runDiagnostics', () => {
  it('should combine all validators', () => {
    const doc = createMockDocument(`
      // Missing version
      indicator("Test")
      x = math.clamp(1, 0, 10)
      plotshape(close, shape=shape.circle)
    `);

    runDiagnostics(doc);
    const diags = diagCollection.get(doc.uri);

    expect(diags.length).toBe(3);  // version + math.clamp + plotshape
  });
});
```

## 总结

Pine Script v6 验证系统遵循以下原则：

1. ✅ **分层架构**: 三层验证，职责分离
2. ✅ **可靠性**: 完善的异常处理，避免扩展崩溃
3. ✅ **可维护性**: 模块化设计，代码复用
4. ✅ **可扩展性**: 易于添加新规则和验证器
5. ✅ **性能**: 优化正则匹配，减少重复计算
6. ✅ **无状态**: 每次验证创建新实例

遵循这些注意事项，可以确保验证系统稳定可靠、易于维护和扩展。
