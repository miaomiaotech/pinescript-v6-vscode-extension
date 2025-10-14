import * as vscode from 'vscode';

/**
 * Color Provider for Pine Script
 * Provides color decorations for:
 * 1. Hex colors: #FF5733, #FF5733AA
 * 2. color.* constants: color.red, color.green, etc.
 * 3. color.rgb() and color.new() function calls
 */
export class PineColorProvider implements vscode.DocumentColorProvider {
    // Pine Script color constants mapping
    private readonly COLOR_CONSTANTS: Record<string, string> = {
        'aqua': '#00FFFF',
        'black': '#000000',
        'blue': '#0000FF',
        'fuchsia': '#FF00FF',
        'gray': '#808080',
        'green': '#008000',
        'lime': '#00FF00',
        'maroon': '#800000',
        'navy': '#000080',
        'olive': '#808000',
        'orange': '#FF8000',
        'purple': '#800080',
        'red': '#FF0000',
        'silver': '#C0C0C0',
        'teal': '#008080',
        'white': '#FFFFFF',
        'yellow': '#FFFF00',
    };

    public provideDocumentColors(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.ColorInformation[]> {
        const colors: vscode.ColorInformation[] = [];
        const text = document.getText();

        // 1. Find hex color literals: #RRGGBB or #RRGGBBAA
        const hexColorRegex = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/g;
        let match: RegExpExecArray | null;

        while ((match = hexColorRegex.exec(text)) !== null) {
            const hexValue = match[1];
            const color = this.parseHexColor(hexValue);
            if (color) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                colors.push(new vscode.ColorInformation(range, color));
            }
        }

        // 2. Find color.* constants: color.red, color.green, etc.
        const colorConstRegex = /\bcolor\.(aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow)\b/g;

        while ((match = colorConstRegex.exec(text)) !== null) {
            const colorName = match[1];
            const hexValue = this.COLOR_CONSTANTS[colorName];
            if (hexValue) {
                const color = this.parseHexColor(hexValue.slice(1)); // Remove #
                if (color) {
                    const startPos = document.positionAt(match.index);
                    const endPos = document.positionAt(match.index + match[0].length);
                    const range = new vscode.Range(startPos, endPos);
                    colors.push(new vscode.ColorInformation(range, color));
                }
            }
        }

        // 3. Find color.rgb() calls: color.rgb(r, g, b[, transp])
        const rgbRegex = /\bcolor\.rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/g;

        while ((match = rgbRegex.exec(text)) !== null) {
            const r = parseInt(match[1], 10);
            const g = parseInt(match[2], 10);
            const b = parseInt(match[3], 10);
            const transp = match[4] ? parseInt(match[4], 10) : 0;

            if (r <= 255 && g <= 255 && b <= 255 && transp <= 100) {
                const alpha = 1 - (transp / 100);
                const color = new vscode.Color(r / 255, g / 255, b / 255, alpha);

                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                colors.push(new vscode.ColorInformation(range, color));
            }
        }

        // 4. Find color.new() calls: color.new(baseColor, transp)
        const newColorRegex = /\bcolor\.new\s*\(\s*color\.(\w+)\s*,\s*(\d+)\s*\)/g;

        while ((match = newColorRegex.exec(text)) !== null) {
            const colorName = match[1];
            const transp = parseInt(match[2], 10);
            const hexValue = this.COLOR_CONSTANTS[colorName];

            if (hexValue && transp <= 100) {
                const baseColor = this.parseHexColor(hexValue.slice(1));
                if (baseColor) {
                    const alpha = 1 - (transp / 100);
                    const color = new vscode.Color(
                        baseColor.red,
                        baseColor.green,
                        baseColor.blue,
                        alpha
                    );

                    const startPos = document.positionAt(match.index);
                    const endPos = document.positionAt(match.index + match[0].length);
                    const range = new vscode.Range(startPos, endPos);
                    colors.push(new vscode.ColorInformation(range, color));
                }
            }
        }

        return colors;
    }

    public provideColorPresentations(
        color: vscode.Color,
        context: { document: vscode.TextDocument; range: vscode.Range },
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.ColorPresentation[]> {
        const presentations: vscode.ColorPresentation[] = [];

        const r = Math.round(color.red * 255);
        const g = Math.round(color.green * 255);
        const b = Math.round(color.blue * 255);
        const a = Math.round((1 - color.alpha) * 100); // Pine uses transparency (0-100)

        // 1. Hex format
        const hex = `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}`;
        if (color.alpha === 1) {
            presentations.push(new vscode.ColorPresentation(hex));
        } else {
            const hexWithAlpha = `${hex}${this.toHex(Math.round(color.alpha * 255))}`;
            presentations.push(new vscode.ColorPresentation(hexWithAlpha));
        }

        // 2. color.rgb() format
        if (color.alpha === 1) {
            presentations.push(new vscode.ColorPresentation(`color.rgb(${r}, ${g}, ${b})`));
        } else {
            presentations.push(new vscode.ColorPresentation(`color.rgb(${r}, ${g}, ${b}, ${a})`));
        }

        // 3. Check if it matches a named color
        const namedColor = this.findNamedColor(r, g, b);
        if (namedColor) {
            if (color.alpha === 1) {
                presentations.push(new vscode.ColorPresentation(`color.${namedColor}`));
            } else {
                presentations.push(new vscode.ColorPresentation(`color.new(color.${namedColor}, ${a})`));
            }
        }

        return presentations;
    }

    private parseHexColor(hex: string): vscode.Color | null {
        if (hex.length === 6) {
            // #RRGGBB
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            return new vscode.Color(r, g, b, 1);
        } else if (hex.length === 8) {
            // #RRGGBBAA
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            const a = parseInt(hex.slice(6, 8), 16) / 255;
            return new vscode.Color(r, g, b, a);
        }
        return null;
    }

    private toHex(value: number): string {
        const hex = value.toString(16).toUpperCase();
        return hex.length === 1 ? '0' + hex : hex;
    }

    private findNamedColor(r: number, g: number, b: number): string | null {
        for (const [name, hex] of Object.entries(this.COLOR_CONSTANTS)) {
            const hexR = parseInt(hex.slice(1, 3), 16);
            const hexG = parseInt(hex.slice(3, 5), 16);
            const hexB = parseInt(hex.slice(5, 7), 16);

            if (hexR === r && hexG === g && hexB === b) {
                return name;
            }
        }
        return null;
    }
}
