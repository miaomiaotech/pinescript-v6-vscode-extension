# Test Scripts

This directory contains standalone test scripts for debugging and validating parser/validator behavior.

## Usage

Run any test from the project root:

```bash
node test-scripts/test-astvisitor.js
```

## Test Files

### Parser Tests
- `test-simple.js` - Basic parser functionality
- `test-parser-debug.js` - Debug parser token consumption
- `test-ast-debug.js` - AST structure analysis
- `test-lexer-debug.js` - Lexer token output
- `test-indent-tokens.js` - Indentation token analysis
- `test-indent-debug.js` - Indentation parsing debug
- `test-else-if.js` - Else-if statement parsing

### Validator Tests
- `test-validator.js` - Unused variable detection
- `test-validator-debug.js` - Validator debug output
- `test-reassignment.js` - Assignment vs declaration (`:=` vs `=`)
- `test-assignment-usage.js` - Assignment usage tracking
- `test-real-file.js` - Test on real Pine Script file

### Scope & Symbol Tests
- `test-function-scope.js` - Function scope variable detection
- `test-global-scope.js` - Global scope variable detection
- `test-identifier-lookup.js` - Identifier lookup in functions

### Provider Tests
- `test-goto-definition.js` - Go to definition behavior
- `test-references.js` - Reference tracking
- `test-astvisitor.js` - AstVisitor with AssignmentStatement

### Parameter Position Tests
- `test-function-params.js` - Parameter position in AST
- `test-param-goto-definition.js` - Parameter "Go to Definition" simulation
- `test-param-definition-integration.js` - Full integration test for parameter lookup
- `test-param-complex-cases.js` - Complex scenarios (multiple params, nested functions, long names)
- `test-param-type-annotation-debug.js` - Debug type annotation parsing
- `test-param-simple-vs-typed.js` - Compare simple vs typed parameter parsing
- `PARAMETER-POSITION-FIX-SUMMARY.md` - Complete documentation of parameter position fix

## Key Behaviors Tested

1. **Assignment vs Declaration**: `x := 2` creates AssignmentStatement, `var x = 2` creates VariableDeclaration
2. **Reference Tracking**: Assignments add to references but don't mark as used
3. **Unused Variables**: Variables only written to (never read) are flagged as unused
4. **Function Scopes**: Variables declared in functions are properly scoped
5. **Go to Definition**: Shows all references including assignment statements
6. **Parameter Position Tracking**: Function parameters now store their exact position in the source code, enabling accurate "Go to Definition" navigation
