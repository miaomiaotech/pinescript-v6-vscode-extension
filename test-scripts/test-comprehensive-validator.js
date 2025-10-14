const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return require('../test/vscode-mock.js');
  }
  return originalRequire.apply(this, arguments);
};

const fs = require('fs');
const { Parser } = require('../dist/src/parser/parser.js');
const { ComprehensiveValidator } = require('../dist/src/parser/comprehensiveValidator.js');

console.log('=== Testing ComprehensiveValidator on actual Pine file ===\n');

const filePath = './samples/通用顶底检测函数.pine';
const code = fs.readFileSync(filePath, 'utf-8');

const parser = new Parser(code);
const ast = parser.parse();

const validator = new ComprehensiveValidator();
const errors = validator.validate(ast);

console.log(`Total errors: ${errors.length}\n`);

// Group errors by type
const unusedErrors = errors.filter(e => e.message.includes('never used'));
const otherErrors = errors.filter(e => !e.message.includes('never used'));

if (unusedErrors.length > 0) {
  console.log('Unused variable warnings:');
  unusedErrors.forEach(err => {
    console.log(`  Line ${err.line}: ${err.message}`);
  });
  console.log('');
}

if (otherErrors.length > 0) {
  console.log('Other errors:');
  otherErrors.forEach(err => {
    console.log(`  Line ${err.line}: ${err.message}`);
  });
  console.log('');
}

// Check specific variables
const checkVars = ['cci_value', 'cci_top', 'cci_bottom', 'kdj_top', 'kdj_bottom'];
console.log('Checking specific variables:');
for (const varName of checkVars) {
  const error = unusedErrors.find(e => e.message.includes(`'${varName}'`));
  if (error) {
    console.log(`  ❌ ${varName}: reported as unused (line ${error.line})`);
  } else {
    console.log(`  ✅ ${varName}: not reported as unused`);
  }
}
