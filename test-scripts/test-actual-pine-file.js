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
const { SymbolTable } = require('../dist/src/parser/symbolTable.js');
const { AstVisitor } = require('../dist/src/parser/astVisitor.js');

const filePath = './samples/detect-high-low.pine';
const code = fs.readFileSync(filePath, 'utf-8');

console.log('=== Testing actual Pine file: detect-high-low.pine ===\n');

const parser = new Parser(code);
const ast = parser.parse();
const symbolTable = new SymbolTable();
const visitor = new AstVisitor(symbolTable);
visitor.visit(ast);

console.log('Checking line 94: allow_repeat_signals usage in function call');
const allowRepeatSignals = symbolTable.lookup('allow_repeat_signals');
if (allowRepeatSignals) {
  console.log(`  Variable: allow_repeat_signals`);
  console.log(`  Defined at: line ${allowRepeatSignals.line}, col ${allowRepeatSignals.column}`);
  console.log(`  Used: ${allowRepeatSignals.used}`);
  console.log(`  References: ${allowRepeatSignals.references.length}`);

  if (allowRepeatSignals.used) {
    console.log('  ✅ Correctly marked as used');
  } else {
    console.log('  ❌ NOT marked as used (BUG)');
  }
} else {
  console.log('  ❌ Variable not found');
}

console.log('\n');
console.log('Checking lines 101-102: rsi_top and rsi_bottom usage in plotshape');
const rsiTop = symbolTable.lookup('rsi_top');
const rsiBottom = symbolTable.lookup('rsi_bottom');

if (rsiTop) {
  console.log(`  Variable: rsi_top`);
  console.log(`  Defined at: line ${rsiTop.line}, col ${rsiTop.column}`);
  console.log(`  Used: ${rsiTop.used}`);
  console.log(`  References: ${rsiTop.references.length}`);

  if (rsiTop.used && rsiTop.references.length >= 1) {
    console.log('  ✅ Correctly marked as used with references');
  } else {
    console.log('  ❌ NOT properly tracked (BUG)');
  }
} else {
  console.log('  ❌ rsi_top not found');
}

console.log('\n');

if (rsiBottom) {
  console.log(`  Variable: rsi_bottom`);
  console.log(`  Defined at: line ${rsiBottom.line}, col ${rsiBottom.column}`);
  console.log(`  Used: ${rsiBottom.used}`);
  console.log(`  References: ${rsiBottom.references.length}`);

  if (rsiBottom.used && rsiBottom.references.length >= 1) {
    console.log('  ✅ Correctly marked as used with references');
  } else {
    console.log('  ❌ NOT properly tracked (BUG)');
  }
} else {
  console.log('  ❌ rsi_bottom not found');
}

console.log('\n');
console.log('Checking position of destructured variables (should point to variable name, not bracket)');
console.log('Line 94: [rsi_top, rsi_bottom] = detect_high_low(...)');
console.log(`  Expected rsi_top at col 2, got col ${rsiTop ? rsiTop.column : 'N/A'}`);
console.log(`  Expected rsi_bottom at col 11, got col ${rsiBottom ? rsiBottom.column : 'N/A'}`);

if (rsiTop && rsiTop.column === 2) {
  console.log('  ✅ rsi_top position correct');
} else {
  console.log('  ❌ rsi_top position wrong (BUG)');
}

if (rsiBottom && rsiBottom.column === 11) {
  console.log('  ✅ rsi_bottom position correct');
} else {
  console.log('  ❌ rsi_bottom position wrong (BUG)');
}
