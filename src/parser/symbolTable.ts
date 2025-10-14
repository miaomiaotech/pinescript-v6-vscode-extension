// Symbol Table for tracking variables, functions, and scopes
import { Range } from 'vscode';
import { PineType } from './typeSystem';

export interface Symbol {
  name: string;
  type: PineType;
  line: number;
  column: number;
  used: boolean;
  kind: 'variable' | 'function' | 'parameter';
  declaredWith?: 'var' | 'varip' | 'const' | null; // for variables
  references: Range[];
}

export class Scope {
  private symbols: Map<string, Symbol> = new Map();
  private parent: Scope | null;
  private children: Scope[] = [];

  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  define(symbol: Symbol): void {
    this.symbols.set(symbol.name, symbol);
  }

  lookup(name: string): Symbol | undefined {
    const symbol = this.symbols.get(name);
    if (symbol) return symbol;
    if (this.parent) return this.parent.lookup(name);
    return undefined;
  }

  lookupLocal(name: string): Symbol | undefined {
    return this.symbols.get(name);
  }

  getAllSymbols(): Symbol[] {
    return Array.from(this.symbols.values());
  }

  getUnusedSymbols(): Symbol[] {
    return this.getAllSymbols().filter(s => !s.used && (s.kind === 'variable' || s.kind === 'parameter'));
  }

  getAllUnusedSymbolsRecursive(): Symbol[] {
    let unused = this.getUnusedSymbols();
    for (const child of this.children) {
      unused = unused.concat(child.getAllUnusedSymbolsRecursive());
    }
    return unused;
  }

  markUsed(name: string, range: Range): void {
    const symbol = this.symbols.get(name);
    if (symbol) {
      symbol.used = true;
      symbol.references.push(range);
    } else if (this.parent) {
      this.parent.markUsed(name, range);
    }
  }

  createChild(): Scope {
    const child = new Scope(this);
    this.children.push(child);
    return child;
  }

  getParent(): Scope | null {
    return this.parent;
  }
}

export class SymbolTable {
  private globalScope: Scope;
  private currentScope: Scope;

  constructor() {
    this.globalScope = new Scope();
    this.currentScope = this.globalScope;
    this.initializeBuiltins();
  }

  private initializeBuiltins(): void {
    // Built-in variables - series<float>
    const seriesFloatVars = [
      'close', 'open', 'high', 'low', 'volume',
      'hl2', 'hlc3', 'ohlc4', 'hlcc4',
    ];

    for (const name of seriesFloatVars) {
      this.globalScope.define({
        name,
        type: 'series<float>',
        line: 0,
        column: 0,
        used: false,
        kind: 'variable',
        references: [],
      });
    }

    // Built-in variables - series<int>
    const seriesIntVars = [
      'time', 'bar_index', 'last_bar_index',
      // Date/time built-ins
      'year', 'month', 'weekofyear', 'dayofmonth', 'dayofweek',
      'hour', 'minute', 'second',
      // Chart built-ins
      'timenow', 'timestamp',
    ];

    for (const name of seriesIntVars) {
      this.globalScope.define({
        name,
        type: 'series<int>',
        line: 0,
        column: 0,
        used: false,
        kind: 'variable',
        references: [],
      });
    }

    // Special built-in variables (namespaces and special values)
    const specialVars: Array<{ name: string; type: PineType }> = [
      { name: 'na', type: 'na' },
      { name: 'syminfo', type: 'unknown' },
      { name: 'timeframe', type: 'unknown' },
      { name: 'barstate', type: 'unknown' },
    ];

    for (const { name, type } of specialVars) {
      this.globalScope.define({
        name,
        type,
        line: 0,
        column: 0,
        used: false,
        kind: 'variable',
        references: [],
      });
    }

    // Built-in functions
    const builtinFuncs = [
      'plot', 'plotshape', 'plotchar', 'hline', 'bgcolor', 'barcolor',
      'indicator', 'strategy', 'library',
      'alert', 'alertcondition',
      'label', 'line', 'box', 'table',
      'nz', 'na',
    ];

    for (const name of builtinFuncs) {
      this.globalScope.define({
        name,
        type: 'unknown',
        line: 0,
        column: 0,
        used: false,
        kind: 'function',
        references: [],
      });
    }

    // Keywords (treated as reserved symbols)
    const keywords = [
      'break', 'continue', 'type',
    ];

    for (const name of keywords) {
      this.globalScope.define({
        name,
        type: 'unknown',  // Keywords don't have a value type
        line: 0,
        column: 0,
        used: false,
        kind: 'variable',
        references: [],
      });
    }

    // Namespaces (treated as symbols)
    // Complete list of all 48 Pine Script v6 built-in namespaces
    // Source: v6/raw/v6-language-constructs.json
    const namespaces = [
      // Function namespaces
      'array', 'box', 'chart', 'color', 'input', 'label', 'line', 'linefill',
      'log', 'map', 'math', 'matrix', 'polyline', 'request', 'runtime', 'str',
      'strategy', 'syminfo', 'ta', 'table', 'ticker', 'timeframe',

      // Constant namespaces
      // NOTE: 'dayofweek' namespace removed - conflicts with dayofweek variable
      // Both exist in Pine Script but context determines which is used
      'adjustment', 'alert', 'backadjustment', 'barmerge', 'currency',
      'display', 'dividends', 'earnings', 'extend', 'font', 'format', 'hline',
      'location', 'order', 'plot', 'position', 'scale', 'session',
      'settlement_as_close', 'shape', 'size', 'splits', 'text', 'xloc', 'yloc',
    ];

    for (const name of namespaces) {
      this.globalScope.define({
        name,
        type: 'unknown',
        line: 0,
        column: 0,
        used: false,
        kind: 'variable',
        references: [],
      });
    }
  }

  enterScope(): void {
    this.currentScope = this.currentScope.createChild();
  }

  exitScope(): void {
    const parent = this.currentScope.getParent();
    if (parent) {
      this.currentScope = parent;
    }
  }

  define(symbol: Symbol): void {
    this.currentScope.define(symbol);
  }

  lookup(name: string): Symbol | undefined {
    return this.currentScope.lookup(name);
  }

  lookupLocal(name: string): Symbol | undefined {
    return this.currentScope.lookupLocal(name);
  }

  markUsed(name: string, range: Range): void {
    this.currentScope.markUsed(name, range);
  }

  getCurrentScope(): Scope {
    return this.currentScope;
  }

  getGlobalScope(): Scope {
    return this.globalScope;
  }

  getAllUnusedSymbols(): Symbol[] {
    return this.globalScope.getAllUnusedSymbolsRecursive();
  }

  // Get all symbols from all scopes recursively
  getAllSymbols(): Symbol[] {
    const symbols: Symbol[] = [];
    const collectSymbols = (scope: Scope) => {
      symbols.push(...scope.getAllSymbols());
      // Access private children through the scope's method if available
      const children = (scope as any).children || [];
      for (const child of children) {
        collectSymbols(child);
      }
    };
    collectSymbols(this.globalScope);
    return symbols;
  }

  // Find similar symbol names (for typo suggestions)
  findSimilarSymbols(name: string, threshold: number = 2): string[] {
    const allSymbols = this.getAllSymbolNames();
    const similar: string[] = [];

    for (const symbolName of allSymbols) {
      const distance = this.levenshteinDistance(name, symbolName);
      if (distance <= threshold && distance > 0) {
        similar.push(symbolName);
      }
    }

    return similar.sort((a, b) => {
      const distA = this.levenshteinDistance(name, a);
      const distB = this.levenshteinDistance(name, b);
      return distA - distB;
    });
  }

  private getAllSymbolNames(): string[] {
    const names: string[] = [];
    let scope: Scope | null = this.currentScope;

    while (scope) {
      names.push(...scope.getAllSymbols().map(s => s.name));
      scope = scope.getParent();
    }

    return [...new Set(names)];
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
