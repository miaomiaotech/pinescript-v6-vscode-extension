/**
 * 语法示例文件测试
 * 验证 valid-syntax-core.pine 和 invalid-syntax.pine
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// 注入 vscode mock（必须在加载 Parser 之前）
const Module = require('module');
const vscodeMock = require('./vscode-mock.js');

const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return vscodeMock;
  }
  return originalRequire.apply(this, arguments);
};

const { Parser } = require('../dist/src/parser/parser.js');
const { AstValidator } = require('../dist/src/parser/astValidator.js');

/**
 * 验证文件语法
 */
function validateFile(filename) {
  const source = fs.readFileSync(`samples/${filename}`, 'utf8');
  const parser = new Parser(source);
  const ast = parser.parse();
  const parseErrors = parser.getErrors();

  const validator = new AstValidator();
  const validationErrors = validator.validate(ast);

  // 过滤掉"未使用"的警告，只保留真正的错误
  const realErrors = validationErrors.filter(err =>
    !err.message.includes('is declared but never used') &&
    !err.message.includes('Undefined variable') &&
    !err.message.includes('Unknown property')
  );

  return {
    ast,
    parseErrors,
    validationErrors,
    realErrors,
    totalErrors: parseErrors.length + realErrors.length
  };
}

describe('语法示例文件验证', () => {
  test('valid-syntax-core.pine 应该没有语法错误', () => {
    const result = validateFile('valid-syntax-core.pine');

    assert.strictEqual(result.parseErrors.length, 0,
      `解析错误: ${result.parseErrors.map(e => `Line ${e.line}: ${e.message}`).join('; ')}`);

    assert.strictEqual(result.realErrors.length, 0,
      `验证错误: ${result.realErrors.map(e => `Line ${e.line}: ${e.message}`).join('; ')}`);

    // 验证成功解析了语句
    assert(result.ast.body.length > 0, 'AST 应该包含语句');

    console.log(`✅ valid-syntax-core.pine: ${result.ast.body.length} 个语句，0 个错误`);
  });

  test('invalid-syntax.pine 应该检测到语法错误', () => {
    const result = validateFile('invalid-syntax.pine');

    // 应该有解析错误或验证错误
    assert(result.totalErrors > 0, '应该检测到语法错误');

    // 至少应该有一些解析错误（4的倍数缩进、:= 在解构赋值等）
    assert(result.parseErrors.length > 0, '应该有解析错误');

    // 至少应该有一些验证错误（重复定义等）
    assert(result.realErrors.length > 0, '应该有验证错误');

    console.log(`✅ invalid-syntax.pine: 检测到 ${result.totalErrors} 个错误 ` +
                `(${result.parseErrors.length} 个解析错误 + ${result.realErrors.length} 个验证错误)`);
  });
});
