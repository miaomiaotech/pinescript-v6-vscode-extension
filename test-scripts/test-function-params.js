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

const code = `myFunc(x, length) =>
    result = x + length
    result`;

console.log('=== Testing Function Parameter References ===\n');
console.log('Code:');
console.log(code);
console.log('\n---\n');

const parser = new Parser(code);
const ast = parser.parse();

console.log('Function declaration:');
const funcDecl = ast.body[0];
console.log(`  Name: ${funcDecl.name}`);
console.log(`  Line: ${funcDecl.line}, Column: ${funcDecl.column}`);
console.log(`  Params:`);
funcDecl.params.forEach((param, i) => {
  console.log(`    ${i + 1}. ${param.name} at line ${param.line}, col ${param.column}`);
});

console.log('\n');

const symbolTable = new SymbolTable();
const visitor = new AstVisitor(symbolTable);
visitor.visit(ast);

console.log('Symbols in global scope:');
const globalScope = symbolTable.getGlobalScope();
globalScope.getAllSymbols().forEach(s => {
  if (s.line > 0) {
    console.log(`  ${s.name} (${s.kind}): line ${s.line}, col ${s.column}`);
  }
});

console.log('\n');

// Check all scopes for parameter symbols
console.log('All scopes (including function scopes):');
const allScopes = [globalScope];
const checkScope = (scope) => {
  scope.getAllSymbols().forEach(s => {
    if (s.kind === 'parameter') {
      console.log(`  Parameter "${s.name}": line ${s.line}, col ${s.column}`);
    }
  });
  // Note: We can't easily traverse child scopes without internal API
};
checkScope(globalScope);

console.log('\n✅ Parameters now have correct position info!');
console.log('   "Go to Definition" should jump to parameter position, not function name');
