import * as vscode from 'vscode';
import { Parser } from './parser/parser';
import { SymbolTable } from './parser/symbolTable';
import { AstVisitor } from './parser/astVisitor';

export class RenameProvider implements vscode.RenameProvider {

    // Optional: prepareRename can check if a symbol is renameable and provide the exact range of the name.
    prepareRename?(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string; }> {
        
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return Promise.reject('Not a valid symbol.');
        }

        const word = document.getText(wordRange);
        const symbolTable = this.buildSymbolTable(document);
        const symbol = symbolTable.lookup(word);

        // Reject renaming built-in symbols or if the symbol is not found
        if (!symbol || symbol.line === 0) {
            return Promise.reject('This symbol cannot be renamed.');
        }

        return wordRange;
    }

    // provideRenameEdits is the core method that provides all the text edits.
    public provideRenameEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        newName: string,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.WorkspaceEdit> {

        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }
        const oldName = document.getText(wordRange);

        const symbolTable = this.buildSymbolTable(document);
        const symbol = symbolTable.lookup(oldName);

        if (!symbol || symbol.line === 0) {
            return null;
        }

        const workspaceEdit = new vscode.WorkspaceEdit();

        // 1. Add the edit for the definition itself
        const defPosition = new vscode.Position(symbol.line - 1, symbol.column - 1);
        const defRange = new vscode.Range(defPosition, defPosition.translate(0, symbol.name.length));
        workspaceEdit.replace(document.uri, defRange, newName);

        // 2. Add edits for all references
        for (const refRange of symbol.references) {
            workspaceEdit.replace(document.uri, refRange, newName);
        }

        return workspaceEdit;
    }

    // Helper function to parse the document and build a complete symbol table
    private buildSymbolTable(document: vscode.TextDocument): SymbolTable {
        const parser = new Parser(document.getText());
        const ast = parser.parse();
        const symbolTable = new SymbolTable();
        const visitor = new AstVisitor(symbolTable);
        visitor.visit(ast);
        return symbolTable;
    }
}
