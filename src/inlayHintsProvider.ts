import * as vscode from 'vscode';
import { Parser } from './parser/parser';
import { AstValidator } from './parser/astValidator';
import { SymbolTable } from './parser/symbolTable';
import * as AST from './parser/ast';

/**
 * Inlay Hints Provider for Pine Script
 * Shows inferred types next to variable declarations
 */
export class PineInlayHintsProvider implements vscode.InlayHintsProvider {
    public provideInlayHints(
        document: vscode.TextDocument,
        range: vscode.Range,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.InlayHint[]> {
        // Check if the feature is enabled
        const config = vscode.workspace.getConfiguration('pine');
        const enabled = config.get<boolean>('inlayHints.enabled', true);

        if (!enabled) {
            return [];
        }

        const hints: vscode.InlayHint[] = [];
        const text = document.getText();

        try {
            // Parse the document
            const parser = new Parser(text);
            const ast = parser.parse();

            // Run validator to build symbol table with type information
            const validator = new AstValidator();
            validator.validate(ast);

            // Get the cached symbol map from validator (optimized - no need to rebuild)
            const symbolMap = validator.getSymbolMap();

            // Collect type hints for variables in the visible range
            this.collectTypeHints(ast, symbolMap, range, document, hints);

        } catch (e) {
            // Silently fail - don't show hints if parsing fails
            console.error('Failed to provide inlay hints:', e);
        }

        return hints;
    }

    private collectTypeHints(
        node: AST.ASTNode,
        symbolMap: Map<string, any>,
        range: vscode.Range,
        document: vscode.TextDocument,
        hints: vscode.InlayHint[]
    ): void {
        // Process variable declarations
        if (node.type === 'VariableDeclaration') {
            const varDecl = node as AST.VariableDeclaration;

            // Check if the declaration is in the visible range
            const pos = new vscode.Position(varDecl.nameLine - 1, varDecl.nameColumn - 1);
            if (range.contains(pos)) {
                // Look up the symbol by name and line
                const key = `${varDecl.name}:${varDecl.nameLine}`;
                const symbol = symbolMap.get(key);
                if (symbol && symbol.type && symbol.type !== 'unknown') {
                    // Create inlay hint after the variable name
                    const position = new vscode.Position(
                        varDecl.nameLine - 1,
                        varDecl.nameColumn - 1 + varDecl.name.length
                    );

                    const hint = new vscode.InlayHint(
                        position,
                        `: ${this.formatType(symbol.type)}`,
                        vscode.InlayHintKind.Type
                    );

                    // Add tooltip with more information
                    hint.tooltip = `Inferred type: ${symbol.type}`;

                    // Make the hint slightly less prominent
                    hint.paddingLeft = true;

                    hints.push(hint);
                }
            }

            // Don't return early - continue processing to handle children
        }

        // Process destructuring assignments
        if (node.type === 'DestructuringAssignment') {
            const destructuring = node as AST.DestructuringAssignment;

            for (const variable of destructuring.variables) {
                // Check if in visible range
                const pos = new vscode.Position(variable.line - 1, variable.column - 1);
                if (!range.contains(pos)) {
                    continue;
                }

                // Look up the symbol by name and line
                const key = `${variable.name}:${variable.line}`;
                const symbol = symbolMap.get(key);
                if (symbol && symbol.type && symbol.type !== 'unknown') {
                    const position = new vscode.Position(
                        variable.line - 1,
                        variable.column - 1 + variable.name.length
                    );

                    const hint = new vscode.InlayHint(
                        position,
                        `: ${this.formatType(symbol.type)}`,
                        vscode.InlayHintKind.Type
                    );

                    hint.tooltip = `Inferred type: ${symbol.type}`;
                    hint.paddingLeft = true;

                    hints.push(hint);
                }
            }
        }

        // Recursively process child nodes
        if (node.type === 'Program') {
            const program = node as AST.Program;
            for (const stmt of program.body) {
                this.collectTypeHints(stmt, symbolMap, range, document, hints);
            }
        } else if (node.type === 'FunctionDeclaration') {
            const funcDecl = node as AST.FunctionDeclaration;
            // Process statements in function body
            for (const stmt of funcDecl.body) {
                this.collectTypeHints(stmt, symbolMap, range, document, hints);
            }
        } else if (node.type === 'IfStatement') {
            const ifStmt = node as AST.IfStatement;
            // Process consequent (then branch)
            for (const stmt of ifStmt.consequent) {
                this.collectTypeHints(stmt, symbolMap, range, document, hints);
            }
            // Process alternate (else branch)
            if (ifStmt.alternate) {
                for (const stmt of ifStmt.alternate) {
                    this.collectTypeHints(stmt, symbolMap, range, document, hints);
                }
            }
        } else if (node.type === 'ForStatement') {
            const forStmt = node as AST.ForStatement;
            // Process for loop body
            for (const stmt of forStmt.body) {
                this.collectTypeHints(stmt, symbolMap, range, document, hints);
            }
        } else if (node.type === 'WhileStatement') {
            const whileStmt = node as AST.WhileStatement;
            // Process while loop body
            for (const stmt of whileStmt.body) {
                this.collectTypeHints(stmt, symbolMap, range, document, hints);
            }
        }
    }

    /**
     * Format type for display (make it more readable)
     */
    private formatType(type: string): string {
        // Remove angle brackets for cleaner display
        // series<float> -> series float
        return type.replace(/<(.+)>/, ' $1');
    }
}
