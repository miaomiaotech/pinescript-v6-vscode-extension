/**
 * Pattern-based Pine Script v6 Validator
 * Uses regex patterns and officially verified parameter requirements
 * Complete v6 language support (6,665 items)
 */

import * as vscode from 'vscode';
import { PINE_FUNCTIONS_MERGED as ALL_FUNCTION_SIGNATURES } from '../../v6/parameter-requirements-merged';
import { isValidNamespaceMember, CONSTANT_NAMESPACES } from '../../v6/pine-constants-complete';
import {
  STANDALONE_BUILTINS,
  VARIABLE_NAMESPACES,
  FUNCTION_NAMESPACES,
  KEYWORDS,
  TYPE_NAMES,
  isBuiltInVariable as isBuiltIn,
  isKnownNamespace
} from '../../v6/pine-builtins-complete';

export interface ValidationError {
  line: number;
  column: number;
  length: number;
  message: string;
  severity: vscode.DiagnosticSeverity;
}

export class PatternValidator {
  private errors: ValidationError[] = [];

  // Complete v6 namespace support (31 constant + 21 variable + 22 function namespaces)
  private knownNamespaces = new Set([
    ...CONSTANT_NAMESPACES,
    ...VARIABLE_NAMESPACES,
    ...FUNCTION_NAMESPACES
  ]);

  private declaredVariables = new Set<string>();

  // Functions with unreliable auto-generated parameter data - skip parameter validation
  private unreliableParamFunctions = new Set([
    'table.set_bgcolor', 'table.set_border_color', 'table.set_border_width',
    'table.set_frame_color', 'table.set_frame_width', 'table.set_position',
    'table.cell_set_bgcolor', 'table.cell_set_text_color', 'table.cell_set_text',
    'table.cell_set_width', 'table.cell_set_height'
  ]);

  validate(text: string): ValidationError[] {
    this.errors = [];
    this.declaredVariables.clear();

    // First pass: collect declared variables
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      this.collectDeclaredVariables(lines[i]);
    }

    // Second pass: validate function calls and undefined references
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip blank lines and comments
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) {
        continue;
      }

      // Remove string literals to avoid false positives on content inside strings
      const lineWithoutStrings = this.removeStringLiterals(line);

      // Check undefined namespaces (e.g., ssss.adas)
      this.checkUndefinedNamespaces(lineWithoutStrings, lineNum);

      // Check incomplete references (e.g., plot.styl, plot.)
      this.checkIncompleteReferences(lineWithoutStrings, lineNum);

      // Check undefined function calls (e.g., sometin())
      this.checkUndefinedFunctions(lineWithoutStrings, lineNum);

      // Check invalid comma-separated var declarations (e.g., var float a = na, b = na)
      this.checkInvalidVarDeclarations(line, lineNum);  // Keep original for this check

      // Check each registered function (use original line for parameter extraction)
      for (const [funcName, spec] of Object.entries(ALL_FUNCTION_SIGNATURES)) {
        this.validateFunctionCall(line, lineNum, funcName, spec);
      }
    }

    return this.errors;
  }

  private removeStringLiterals(line: string): string {
    // Replace all string literals with empty strings to avoid validating their content
    // Handles both single and double quoted strings
    return line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  }

  private collectDeclaredVariables(line: string): void {
    // Match variable declarations: varname = ..., var type varname = ..., varip type varname = ...
    const varDeclarations = line.matchAll(/\b(var|varip)?\s*(?:int|float|bool|string|color)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g);
    for (const match of varDeclarations) {
      const varName = match[2];
      if (varName && !this.isReservedKeyword(varName)) {
        this.declaredVariables.add(varName);
      }
    }

    // Match function parameters: funcName(..., paramName, ...)
    const paramDeclarations = line.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*=>/g);
    for (const match of paramDeclarations) {
      const funcName = match[1];
      if (funcName) {
        this.declaredVariables.add(funcName);
      }
    }
  }

  private checkUndefinedNamespaces(line: string, lineNum: number): void {
    // Match namespace.member patterns
    const namespacePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = namespacePattern.exec(line)) !== null) {
      const namespace = match[1];
      const member = match[2];
      const column = match.index;

      // Skip if this is a parameter assignment (e.g., style=plot.style_line)
      // Check if there's an = sign before the namespace
      const beforeMatch = line.substring(0, column);
      if (/\w+\s*=\s*$/.test(beforeMatch)) {
        // This is something like "style=plot.style_line", skip the check
        continue;
      }

      // Skip if it's a known namespace, declared variable, or built-in
      if (!this.knownNamespaces.has(namespace) &&
          !this.declaredVariables.has(namespace) &&
          !this.isBuiltInVariable(namespace)) {
        this.addError(
          lineNum,
          column,
          namespace.length + 1 + member.length,
          `Undefined namespace or variable '${namespace}'`,
          vscode.DiagnosticSeverity.Error
        );
      }
      // Check if member is a valid constant for known namespaces
      else if (this.knownNamespaces.has(namespace)) {
        const isValid = this.isValidConstantOrFunction(namespace, member);

        if (!isValid) {
          // Check for constant-like namespaces (all 31 constant namespaces from v6)
          const constantNamespaces = new Set([
            'adjustment', 'alert', 'backadjustment', 'barmerge', 'barstate', 'color',
            'currency', 'dayofweek', 'display', 'dividends', 'earnings', 'extend',
            'font', 'format', 'hline', 'label', 'line', 'location', 'math', 'order',
            'plot', 'position', 'scale', 'session', 'settlement_as_close', 'shape',
            'size', 'splits', 'strategy', 'table', 'text', 'xloc', 'yloc'
          ]);
          if (constantNamespaces.has(namespace)) {
            this.addError(
              lineNum,
              column + namespace.length + 1,
              member.length,
              `Unknown ${namespace} constant or function '${member}'`,
              vscode.DiagnosticSeverity.Warning
            );
          }
        }
      }
    }
  }

  private checkIncompleteReferences(line: string, lineNum: number): void {
    // Match patterns like "namespace." followed by nothing, whitespace, or end of line
    // This catches cases like "plot.styl" where "styl" is incomplete
    const incompletePattern = /\b([a-z]+)\.\s*($|[^a-zA-Z0-9_])/g;
    let match;

    while ((match = incompletePattern.exec(line)) !== null) {
      const namespace = match[1];
      const column = match.index;

      // Only flag if it's a known namespace
      if (this.knownNamespaces.has(namespace)) {
        // Check if this is truly incomplete (no member after the dot)
        const afterDot = match[2];
        if (!afterDot || afterDot.trim() === '' || !/^[a-zA-Z_]/.test(afterDot)) {
          this.addError(
            lineNum,
            column,
            namespace.length + 1,
            `Incomplete reference to '${namespace}' namespace`,
            vscode.DiagnosticSeverity.Error
          );
        }
      }
    }
  }

  private checkInvalidVarDeclarations(line: string, lineNum: number): void {
    // Match invalid comma-separated var declarations:
    // var float a = na, b = na  (INVALID in Pine Script v6)
    // var int x = 0, y = 0      (INVALID in Pine Script v6)
    // Pine Script v6 requires: var float a = na \n var float b = na

    const invalidVarPattern = /\b(var|varip)\s+(int|float|bool|string|color)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*[^,\n]+,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
    let match;

    while ((match = invalidVarPattern.exec(line)) !== null) {
      const declarationMode = match[1];  // var or varip
      const type = match[2];             // int, float, etc.
      const firstVar = match[3];
      const secondVar = match[4];
      const column = match.index;

      this.addError(
        lineNum,
        column,
        match[0].length,
        `Invalid comma-separated variable declaration. Pine Script v6 requires separate declarations:\n${declarationMode} ${type} ${firstVar} = ...\n${declarationMode} ${type} ${secondVar} = ...`,
        vscode.DiagnosticSeverity.Error
      );
    }
  }

  private isValidConstantOrFunction(namespace: string, member: string): boolean {
    // Check if it's a valid constant
    if (isValidNamespaceMember(namespace, member)) {
      return true;
    }

    // Check if it's a known function
    const fullName = `${namespace}.${member}`;
    if (ALL_FUNCTION_SIGNATURES[fullName]) {
      return true;
    }

    return false;
  }

  private checkUndefinedFunctions(line: string, lineNum: number): void {
    // Match function calls: funcName(...)
    const funcPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match;
    while ((match = funcPattern.exec(line)) !== null) {
      const funcName = match[1];
      const column = match.index;

      // Skip if it's a known function, declared variable, or built-in control structure
      if (!ALL_FUNCTION_SIGNATURES[funcName] &&
          !this.declaredVariables.has(funcName) &&
          !this.isControlStructure(funcName)) {
        // Check if it's a namespaced function that exists
        const beforeFunc = line.substring(0, column);
        const namespaceMatch = beforeFunc.match(/([a-zA-Z_][a-zA-Z0-9_]*)\.\s*$/);
        if (namespaceMatch && this.knownNamespaces.has(namespaceMatch[1])) {
          // It's a namespaced function, check if it exists
          const fullName = `${namespaceMatch[1]}.${funcName}`;
          if (!ALL_FUNCTION_SIGNATURES[fullName]) {
            this.addError(
              lineNum,
              column,
              funcName.length,
              `Undefined function '${fullName}'`,
              vscode.DiagnosticSeverity.Error
            );
          }
        } else if (!namespaceMatch) {
          // It's a standalone function call
          this.addError(
            lineNum,
            column,
            funcName.length,
            `Undefined function '${funcName}'`,
            vscode.DiagnosticSeverity.Error
          );
        }
      }
    }
  }

  private isReservedKeyword(word: string): boolean {
    return KEYWORDS.has(word) || word === 'true' || word === 'false' || word === 'break' || word === 'continue';
  }

  private isBuiltInVariable(word: string): boolean {
    return isBuiltIn(word) || VARIABLE_NAMESPACES.has(word);
  }

  private isControlStructure(word: string): boolean {
    // Control structures, keywords, and operators that should never be flagged
    // All 15 keywords + boolean literals + special values
    return KEYWORDS.has(word) || word === 'true' || word === 'false' || word === 'na' || word === 'break' || word === 'continue';
  }

  private validateFunctionCall(
    line: string,
    lineNum: number,
    functionName: string,
    spec: any
  ): void {
    // Skip type names - they're not functions
    if (TYPE_NAMES.has(functionName)) {
      return;
    }

    // Create regex to match function calls
    // Use negative lookbehind to prevent matching namespaced functions
    // e.g., when checking 'bool', don't match 'input.bool'
    const escapedName = functionName.replace(/\./g, '\\.');
    const regex = new RegExp(`(?<![a-zA-Z0-9_\\.])${escapedName}\\s*\\(([^)]*)\\)`, 'g');

    let match;
    while ((match = regex.exec(line)) !== null) {
      const argsString = match[1];
      const column = match.index;

      // Count arguments (simple split by comma, not perfect but good enough)
      const args = argsString.trim() === '' ? [] : this.splitArguments(argsString);

      const requiredCount = spec.requiredParams ? spec.requiredParams.length : 0;
      const totalCount = (spec.requiredParams ? spec.requiredParams.length : 0) + (spec.optionalParams ? spec.optionalParams.length : 0);

      // Check if function is variadic (signature contains "...")
      const isVariadic = spec.signature && spec.signature.includes('...');

      // Only validate parameter counts for well-defined specs
      // Skip if:
      // 1. Function is in unreliable list (known bad parameter data)
      // 2. Variadic function (contains ...)
      // 3. No parameter info but has signature (auto-generated with incomplete data)
      // 4. Generated functions without parameters array (unreliable)
      if (this.unreliableParamFunctions.has(functionName)) {
        return; // Skip known unreliable functions
      }

      const hasReliableParams = spec.parameters && spec.parameters.length > 0;

      if (isVariadic || (!hasReliableParams && (requiredCount === 0 || totalCount === 0))) {
        // Skip validation for variadic or auto-generated functions with incomplete data
        return;
      }

      // Check if too few arguments
      if (args.length < requiredCount) {
        const missing = spec.requiredParams.slice(args.length);
        this.addError(
          lineNum,
          column,
          functionName.length,
          `Missing required parameter(s) for '${functionName}': ${missing.join(', ')}`,
          vscode.DiagnosticSeverity.Error
        );
      }

      // Check if too many arguments
      if (args.length > totalCount) {
        this.addError(
          lineNum,
          column,
          functionName.length,
          `Too many arguments for '${functionName}'. Expected max ${totalCount}, got ${args.length}`,
          vscode.DiagnosticSeverity.Error
        );
      }

      // Special validations
      this.validateSpecialCases(line, lineNum, column, functionName, args);
    }
  }

  private splitArguments(argsString: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];
      const prevChar = i > 0 ? argsString[i - 1] : '';

      // Handle strings
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        current += char;
        continue;
      }

      if (inString) {
        current += char;
        continue;
      }

      // Handle nesting
      if (char === '(' || char === '[') {
        depth++;
        current += char;
      } else if (char === ')' || char === ']') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        if (current.trim()) {
          args.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  private validateSpecialCases(
    line: string,
    lineNum: number,
    column: number,
    functionName: string,
    args: string[]
  ): void {
    // plotshape: check for "shape=" parameter (should be "style=")
    if (functionName === 'plotshape' && line.includes('shape=')) {
      const shapeIndex = line.indexOf('shape=');
      this.addError(
        lineNum,
        shapeIndex,
        6,
        'Invalid parameter "shape" for plotshape(). Did you mean "style"?',
        vscode.DiagnosticSeverity.Error
      );
    }

    // plotchar: check for "shape=" parameter (should be "char=")
    if (functionName === 'plotchar' && line.includes('shape=')) {
      const shapeIndex = line.indexOf('shape=');
      this.addError(
        lineNum,
        shapeIndex,
        6,
        'Invalid parameter "shape" for plotchar(). Did you mean "char"?',
        vscode.DiagnosticSeverity.Error
      );
    }

    // indicator/strategy: timeframe_gaps without timeframe
    if ((functionName === 'indicator' || functionName === 'strategy') &&
        line.includes('timeframe_gaps') && !line.includes('timeframe=')) {
      const index = line.indexOf('timeframe_gaps');
      this.addError(
        lineNum,
        index,
        14,
        '"timeframe_gaps" has no effect without "timeframe" parameter',
        vscode.DiagnosticSeverity.Warning
      );
    }
  }

  private addError(
    line: number,
    column: number,
    length: number,
    message: string,
    severity: vscode.DiagnosticSeverity
  ): void {
    this.errors.push({
      line,
      column,
      length,
      message,
      severity
    });
  }
}
