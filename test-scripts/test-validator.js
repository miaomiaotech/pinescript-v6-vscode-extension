const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return require('../test/vscode-mock.js');
  }
  return originalRequire.apply(this, arguments);
};

const { Parser } = require('../dist/src/parser/parser.js');
const { AstValidator } = require('../dist/src/parser/astValidator.js');
const fs = require('fs');

const code = fs.readFileSync('test-scripts/test-unused-vars.pine', 'utf8');

console.log('测试代码:');
console.log(code);
console.log('---\n');

const parser = new Parser(code);
const ast = parser.parse();
const parserErrors = parser.getErrors();

console.log(`解析结果:`);
console.log(`  AST 节点数: ${ast.body.length}`);
console.log(`  解析错误: ${parserErrors.length}\n`);

const validator = new AstValidator();
const errors = validator.validate(ast);

console.log(`验证结果:`);
console.log(`  总错误数: ${errors.length}\n`);

const unusedErrors = errors.filter(e => e.type === 1); // ErrType.Unused = 1
const otherErrors = errors.filter(e => e.type !== 1);

console.log(`未使用变量 (${unusedErrors.length}):`);
unusedErrors.forEach(err => {
  console.log(`  - 第 ${err.line} 行: ${err.message}`);
});

if (otherErrors.length > 0) {
  console.log(`\n其他错误 (${otherErrors.length}):`);
  otherErrors.forEach(err => {
    console.log(`  - 第 ${err.line} 行: ${err.message}`);
  });
}

console.log('\n✅ 测试完成');
console.log('\n预期结果:');
console.log('  - unused_var 应该被标记为未使用');
console.log('  - _temp 不应该被标记(下划线开头)');
console.log('  - bottom 应该被标记为未使用');
console.log('  - top 不应该被标记(已使用)');
console.log('  - y 参数不应该被标记(是函数参数)');
