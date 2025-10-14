const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return require('../test/vscode-mock.js');
  }
  return originalRequire.apply(this, arguments);
};

const { Parser } = require('../dist/src/parser/parser.js');
const { SymbolTable } = require('../dist/src/parser/symbolTable.js');
const { AstVisitor } = require('../dist/src/parser/astVisitor.js');
const vscode = require('../test/vscode-mock.js');

// Test case 1: Variable used in function call argument
const code1 = `allow_repeat = true
[top, bottom] = myFunc(value, allow_repeat)`;

console.log('=== Test 1: Variable used in function call ===');
console.log('Code:');
console.log(code1);
console.log('\n');

const parser1 = new Parser(code1);
const ast1 = parser1.parse();
const symbolTable1 = new SymbolTable();
const visitor1 = new AstVisitor(symbolTable1);
visitor1.visit(ast1);

console.log('All symbols:');
symbolTable1.getGlobalScope().getAllSymbols().forEach(s => {
  if (s.line > 0) {
    console.log(`  ${s.name} (${s.kind}): used=${s.used}, references=${s.references.length}`);
  }
});

const allowRepeatSymbol = symbolTable1.lookup('allow_repeat');
if (allowRepeatSymbol) {
  if (allowRepeatSymbol.used) {
    console.log('\n✅ "allow_repeat" is marked as used');
  } else {
    console.log('\n❌ "allow_repeat" is NOT marked as used (BUG)');
  }
} else {
  console.log('\n❌ "allow_repeat" not found');
}

// Test case 2: Variables from destructuring used in function calls
const code2 = `[top, bottom] = myFunc()
plotshape(top, "Top")
plotshape(bottom, "Bottom")`;

console.log('\n\n=== Test 2: Destructured variables used in function calls ===');
console.log('Code:');
console.log(code2);
console.log('\n');

const parser2 = new Parser(code2);
const ast2 = parser2.parse();
const symbolTable2 = new SymbolTable();
const visitor2 = new AstVisitor(symbolTable2);
visitor2.visit(ast2);

console.log('All symbols:');
symbolTable2.getGlobalScope().getAllSymbols().forEach(s => {
  if (s.line > 0) {
    console.log(`  ${s.name} (${s.kind}): used=${s.used}, references=${s.references.length}`);
  }
});

const topSymbol = symbolTable2.lookup('top');
const bottomSymbol = symbolTable2.lookup('bottom');

console.log('\n');
if (topSymbol && topSymbol.used) {
  console.log('✅ "top" is marked as used');
} else {
  console.log('❌ "top" is NOT marked as used (BUG)');
}

if (bottomSymbol && bottomSymbol.used) {
  console.log('✅ "bottom" is marked as used');
} else {
  console.log('❌ "bottom" is NOT marked as used (BUG)');
}
