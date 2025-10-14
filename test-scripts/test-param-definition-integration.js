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

const code = `myFunc(x, length) =>
    result = x + length
    result`;

console.log('=== Integration Test: Parameter Definition Lookup ===\n');
console.log('Code:');
console.log(code);
console.log('\n---\n');

// Parse and build symbol table
const parser = new Parser(code);
const ast = parser.parse();
const symbolTable = new SymbolTable();
const visitor = new AstVisitor(symbolTable);
visitor.visit(ast);

// Test 1: Look up "x" when cursor is inside function body (line 2, col 15)
console.log('Test 1: Cursor on "x" in function body (line 2)');
const positionOnX = new vscode.Position(1, 15); // Line 2, where "x" appears in "result = x + length"
const scopeAtX = visitor.getScopeAtPosition(positionOnX);
const symbolX = scopeAtX.lookup('x');

if (symbolX) {
  console.log(`  ✅ Found parameter "x"`);
  console.log(`     Definition at: line ${symbolX.line}, col ${symbolX.column}`);

  if (symbolX.line === 1 && symbolX.column === 8) {
    console.log('     ✅ PASS: Correctly points to parameter position (line 1, col 8)');
  } else if (symbolX.line === 1 && symbolX.column === 1) {
    console.log('     ❌ FAIL: Still points to function name position');
  } else {
    console.log(`     ⚠️  UNEXPECTED: Wrong position`);
  }
} else {
  console.log('  ❌ FAIL: Symbol "x" not found');
}

console.log('\n');

// Test 2: Look up "length" when cursor is inside function body
console.log('Test 2: Cursor on "length" in function body (line 2)');
const positionOnLength = new vscode.Position(1, 19); // Line 2, where "length" appears
const scopeAtLength = visitor.getScopeAtPosition(positionOnLength);
const symbolLength = scopeAtLength.lookup('length');

if (symbolLength) {
  console.log(`  ✅ Found parameter "length"`);
  console.log(`     Definition at: line ${symbolLength.line}, col ${symbolLength.column}`);

  if (symbolLength.line === 1 && symbolLength.column === 11) {
    console.log('     ✅ PASS: Correctly points to parameter position (line 1, col 11)');
  } else if (symbolLength.line === 1 && symbolLength.column === 1) {
    console.log('     ❌ FAIL: Still points to function name position');
  } else {
    console.log(`     ⚠️  UNEXPECTED: Wrong position`);
  }
} else {
  console.log('  ❌ FAIL: Symbol "length" not found');
}

console.log('\n');

// Test 3: Look up function name in global scope
console.log('Test 3: Cursor on function name (line 1)');
const positionOnFunc = new vscode.Position(0, 1);
const scopeAtFunc = visitor.getScopeAtPosition(positionOnFunc);
const symbolFunc = scopeAtFunc.lookup('myFunc');

if (symbolFunc) {
  console.log(`  ✅ Found function "myFunc"`);
  console.log(`     Definition at: line ${symbolFunc.line}, col ${symbolFunc.column}`);

  if (symbolFunc.line === 1 && symbolFunc.column === 1) {
    console.log('     ✅ PASS: Function at correct position');
  } else {
    console.log(`     ⚠️  UNEXPECTED: Wrong position`);
  }
} else {
  console.log('  ❌ FAIL: Function "myFunc" not found');
}

console.log('\n=== Summary ===');
console.log('This test simulates how VSCode DefinitionProvider works:');
console.log('1. Get scope at cursor position using visitor.getScopeAtPosition()');
console.log('2. Look up symbol in that scope using scope.lookup()');
console.log('3. Return symbol.line and symbol.column for "Go to Definition"');
console.log('\nExpected behavior:');
console.log('  - Parameter "x" should point to line 1, col 8');
console.log('  - Parameter "length" should point to line 1, col 11');
console.log('  - Function "myFunc" should point to line 1, col 1');
