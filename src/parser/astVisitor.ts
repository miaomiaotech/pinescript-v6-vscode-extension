import { Position } from 'vscode';
import * as AST from './ast';
import { SymbolTable, Symbol, Scope } from './symbolTable';

// AST visitor to populate the symbol table with definitions and references
export class AstVisitor {
    private scopeMap: Map<AST.ASTNode, Scope> = new Map();
    private rootNode: AST.Program | null = null;

    constructor(private symbolTable: SymbolTable) {}

    public visit(node: AST.ASTNode) {
        switch (node.type) {
            case 'Program':
                this.visitProgram(node as AST.Program);
                break;
            case 'VariableDeclaration':
                this.visitVariableDeclaration(node as AST.VariableDeclaration);
                break;
            case 'DestructuringAssignment':
                this.visitDestructuringAssignment(node as AST.DestructuringAssignment);
                break;
            case 'AssignmentStatement':
                this.visitAssignmentStatement(node as AST.AssignmentStatement);
                break;
            case 'FunctionDeclaration':
                this.visitFunctionDeclaration(node as AST.FunctionDeclaration);
                break;
            case 'IfStatement':
                this.visitIfStatement(node as AST.IfStatement);
                break;
            case 'ForStatement':
                this.visitForStatement(node as AST.ForStatement);
                break;
            case 'ExpressionStatement':
                this.visit((node as AST.ExpressionStatement).expression);
                break;
            case 'ReturnStatement':
                if ((node as AST.ReturnStatement).value) {
                    this.visit((node as AST.ReturnStatement).value);
                }
                break;
            case 'CallExpression':
                this.visitCallExpression(node as AST.CallExpression);
                break;
            case 'MemberExpression':
                this.visitMemberExpression(node as AST.MemberExpression);
                break;
            case 'BinaryExpression':
                this.visitBinaryExpression(node as AST.BinaryExpression);
                break;
            case 'UnaryExpression':
                this.visit((node as AST.UnaryExpression).argument);
                break;
            case 'TernaryExpression':
                this.visitTernaryExpression(node as AST.TernaryExpression);
                break;
            case 'Identifier':
                this.visitIdentifier(node as AST.Identifier);
                break;
        }
    }

    public getScopeAtPosition(position: Position): Scope {
        if (!this.rootNode) {
            return this.symbolTable.getGlobalScope();
        }

        let mostSpecificScope = this.symbolTable.getGlobalScope();

        const find = (node: AST.ASTNode) => {
            // Check if the node's range contains the position
            if (!node.range.contains(position)) {
                return;
            }

            // If this node defines a new scope, it might be our new most specific scope
            if (this.scopeMap.has(node)) {
                mostSpecificScope = this.scopeMap.get(node)!;
            }

            // Recursively visit children
            switch (node.type) {
                case 'Program':
                    (node as AST.Program).body.forEach(find);
                    break;
                case 'FunctionDeclaration':
                    (node as AST.FunctionDeclaration).body.forEach(find);
                    break;
                case 'IfStatement':
                    const ifStmt = node as AST.IfStatement;
                    ifStmt.consequent.forEach(find);
                    if (ifStmt.alternate) {
                        ifStmt.alternate.forEach(find);
                    }
                    break;
                case 'ForStatement':
                    (node as AST.ForStatement).body.forEach(find);
                    break;
                // Other nodes with children can be added here if they can contain scopes
            }
        };

        find(this.rootNode);
        return mostSpecificScope;
    }

    private visitProgram(node: AST.Program) {
        this.rootNode = node;
        this.scopeMap.set(node, this.symbolTable.getGlobalScope());
        node.body.forEach(stmt => this.visit(stmt));
    }

    private visitVariableDeclaration(node: AST.VariableDeclaration) {
        const symbol: Symbol = {
            name: node.name,
            type: 'unknown', // Type inference can be enhanced later
            line: node.nameLine,
            column: node.nameColumn,
            used: false,
            kind: 'variable',
            declaredWith: node.varType,
            references: [],
        };
        this.symbolTable.define(symbol);

        if (node.init) {
            this.visit(node.init);
        }
    }

    private visitDestructuringAssignment(node: AST.DestructuringAssignment) {
        // Define all variables in the destructuring pattern
        for (const variable of node.variables) {
            const symbol: Symbol = {
                name: variable.name,
                type: 'unknown',
                line: variable.line,
                column: variable.column,
                used: false,
                kind: 'variable',
                declaredWith: null,
                references: [],
            };
            this.symbolTable.define(symbol);
        }

        // Visit the initialization expression
        if (node.init) {
            this.visit(node.init);
        }
    }

    private visitAssignmentStatement(node: AST.AssignmentStatement) {
        // Look up the symbol and add a reference without marking as used
        const symbol = this.symbolTable.lookup(node.name);
        if (symbol) {
            // Add reference but don't mark as used (assignments are writes, not reads)
            symbol.references.push(node.range);
        }

        // Visit the value expression (right-hand side)
        if (node.value) {
            this.visit(node.value);
        }
    }

    private visitFunctionDeclaration(node: AST.FunctionDeclaration) {
        const symbol: Symbol = {
            name: node.name,
            type: 'unknown',
            line: node.line,
            column: node.column,
            used: false,
            kind: 'function',
            references: [],
        };
        this.symbolTable.define(symbol);

        this.symbolTable.enterScope();
        const funcScope = this.symbolTable.getCurrentScope();
        this.scopeMap.set(node, funcScope);

        node.params.forEach(p => {
            const paramSymbol: Symbol = {
                name: p.name,
                type: 'unknown',
                line: p.line,
                column: p.column,
                used: false,
                kind: 'parameter',
                references: [],
            };
            this.symbolTable.define(paramSymbol);
        });

        node.body.forEach(stmt => this.visit(stmt));
        this.symbolTable.exitScope();
    }
    
    private visitIfStatement(node: AST.IfStatement) {
        this.visit(node.condition);
        node.consequent.forEach(stmt => this.visit(stmt));
        if (node.alternate) {
            node.alternate.forEach(stmt => this.visit(stmt));
        }
    }

    private visitForStatement(node: AST.ForStatement) {
        this.visit(node.from);
        this.visit(node.to);
        
        this.symbolTable.enterScope();
        const forScope = this.symbolTable.getCurrentScope();
        this.scopeMap.set(node, forScope);

        const iteratorSymbol: Symbol = {
            name: node.iterator,
            type: 'series<int>',
            line: node.line,
            column: node.column,
            used: false,
            kind: 'variable',
            references: [],
        };
        this.symbolTable.define(iteratorSymbol);
        node.body.forEach(stmt => this.visit(stmt));
        this.symbolTable.exitScope();
    }

    private visitCallExpression(node: AST.CallExpression) {
        this.visit(node.callee);
        node.arguments.forEach(arg => this.visit(arg.value));
    }

    private visitMemberExpression(node: AST.MemberExpression) {
        this.visit(node.object);
        // We don't visit node.property because it's not a variable reference in the current scope
        // e.g., in `a.b`, `b` is a property of `a`, not a standalone symbol.
    }

    private visitBinaryExpression(node: AST.BinaryExpression) {
        this.visit(node.left);
        this.visit(node.right);
    }

    private visitTernaryExpression(node: AST.TernaryExpression) {
        this.visit(node.condition);
        this.visit(node.consequent);
        this.visit(node.alternate);
    }

    private visitIdentifier(node: AST.Identifier) {
        this.symbolTable.markUsed(node.name, node.range);
    }
}
