import * as vscode from 'vscode';
import { getSymbolInfoAtPosition } from './providerUtils';

export class DefinitionProvider implements vscode.DefinitionProvider {
    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition> {

        const symbolInfo = getSymbolInfoAtPosition(document, position);

        if (!symbolInfo) {
            // For built-in functions/variables, return null so hover provider can show docs
            return null;
        }

        const { symbol, uri } = symbolInfo;

        // 1. Check if the cursor is on the definition itself
        const defPosition = new vscode.Position(symbol.line - 1, symbol.column - 1);
        const defRange = new vscode.Range(defPosition, defPosition.translate(0, symbol.name.length));
        const isOnDef = defRange.contains(position);

        // Create a zero-width range for the definition to avoid selection on jump
        const zeroWidthDefRange = new vscode.Range(defPosition, defPosition);

        if (isOnDef) {
            // 2a. If on definition, return all reference locations (as zero-width ranges)
            return symbol.references.map(refRange => {
                const position = refRange.start;
                return new vscode.Location(uri, new vscode.Range(position, position));
            });
        } else {
            // 2b. If on a reference, return the definition location (as a zero-width range)
            return new vscode.Location(uri, zeroWidthDefRange);
        }
    }
}