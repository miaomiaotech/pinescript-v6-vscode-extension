
import * as vscode from 'vscode';
import { Parser } from './parser/parser';
import { SymbolTable, Symbol } from './parser/symbolTable';
import { AstVisitor } from './parser/astVisitor';

/**
 * Represents the result of a symbol lookup at a specific document position.
 */
export interface SymbolInfo {
    symbol: Symbol;
    word: string;
    uri: vscode.Uri;
}

/**
 * Parses a document, builds a symbol table, and looks up the symbol
 * at a given position.
 *
 * @param document The text document to analyze.
 * @param position The position in the document to look up the symbol at.
 * @returns A SymbolInfo object if a valid user-defined symbol is found, otherwise null.
 */
export function getSymbolInfoAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
): SymbolInfo | null {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
        return null;
    }
    const word = document.getText(wordRange);

    try {
        // 1. Parse the document and build the symbol table
        const parser = new Parser(document.getText());
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        const visitor = new AstVisitor(symbolTable);
        visitor.visit(ast);

        // 2. Find the exact scope at the current position
        const scope = visitor.getScopeAtPosition(position);

        // 3. Look up the symbol starting from the correct scope
        const symbol = scope.lookup(word);

        // 4. Ensure the symbol is valid and not a built-in
        if (!symbol || symbol.line === 0) {
            return null;
        }

        return {
            symbol,
            word,
            uri: document.uri,
        };
    } catch (e) {
        // Log errors but don't disrupt the user experience
        console.error('[getSymbolInfoAtPosition Error]', e);
        return null;
    }
}
