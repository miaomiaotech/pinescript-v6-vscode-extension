import * as vscode from 'vscode';
import { getSymbolInfoAtPosition } from './providerUtils';

export class ReferenceProvider implements vscode.ReferenceProvider {
    public provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Location[]> {
        
        const symbolInfo = getSymbolInfoAtPosition(document, position);

        if (!symbolInfo) {
            return null;
        }

        const { symbol, uri } = symbolInfo;

        // 1. Create locations for all references, using a zero-width range to avoid selection
        const referenceLocations = symbol.references.map(refRange => {
            const position = refRange.start;
            return new vscode.Location(uri, new vscode.Range(position, position));
        });

        // 2. If the context requires it, add the definition's location (also as a zero-width range)
        if (context.includeDeclaration) {
            const defPosition = new vscode.Position(symbol.line - 1, symbol.column - 1);
            const defRange = new vscode.Range(defPosition, defPosition);
            const defLocation = new vscode.Location(uri, defRange);
            return [defLocation, ...referenceLocations];
        }

        return referenceLocations;
    }
}
