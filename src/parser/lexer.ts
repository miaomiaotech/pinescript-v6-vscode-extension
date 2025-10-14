/**
 * Pine Script v6 Lexer/Tokenizer
 *
 * This lexer performs lexical analysis on Pine Script v6 source code,
 * converting the raw text into a stream of tokens for parsing.
 *
 * Key Features:
 * - Tracks line and column positions for error reporting
 * - Handles indentation tracking (spaces and tabs)
 * - Supports Pine Script v6 syntax including annotations, comments, and color literals
 * - Recognizes keywords, operators, identifiers, and literals
 */

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOL = 'BOOL',
  COLOR = 'COLOR',

  // Identifiers and Keywords
  IDENTIFIER = 'IDENTIFIER',
  KEYWORD = 'KEYWORD',

  // Operators
  ASSIGN = 'ASSIGN',           // =, :=
  PLUS = 'PLUS',               // +
  MINUS = 'MINUS',             // -
  MULTIPLY = 'MULTIPLY',       // *
  DIVIDE = 'DIVIDE',           // /
  MODULO = 'MODULO',           // %
  COMPARE = 'COMPARE',         // ==, !=, <, >, <=, >=
  TERNARY = 'TERNARY',         // ?

  // Delimiters
  LPAREN = 'LPAREN',           // (
  RPAREN = 'RPAREN',           // )
  LBRACKET = 'LBRACKET',       // [
  RBRACKET = 'RBRACKET',       // ]
  COMMA = 'COMMA',             // ,
  DOT = 'DOT',                 // .
  COLON = 'COLON',             // :
  ARROW = 'ARROW',             // =>

  // Special
  NEWLINE = 'NEWLINE',
  COMMENT = 'COMMENT',
  ANNOTATION = 'ANNOTATION',   // //@version=6
  EOF = 'EOF',
  WHITESPACE = 'WHITESPACE',
  ERROR = 'ERROR',             // Lexical errors
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  length: number;
  indent?: number;  // Indentation level (number of spaces at line start)
  endLine?: number;    // End line number (for multi-line tokens)
  endColumn?: number;  // End column number
}

export interface LexerError {
  message: string;
  line: number;
  column: number;
  length: number;
}

const KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'break', 'continue', 'return',
  'var', 'varip', 'const',
  'na',  // "not available" - indicates a variable has no assigned value
  'export', 'import', 'as',
  'switch', 'case', 'default',
  'type',  // Pine Script v6 custom type definitions
  'and', 'or', 'not',
  'int', 'float', 'bool', 'string', 'color', 'line', 'label',
  'box', 'table', 'array', 'matrix', 'map',
  'series', 'simple', 'input',
  'then',
  'to',
]);

// Map of single-character tokens for cleaner code
const SINGLE_CHAR_TOKENS = new Map<string, TokenType>([
  ['(', TokenType.LPAREN],
  [')', TokenType.RPAREN],
  ['[', TokenType.LBRACKET],
  [']', TokenType.RBRACKET],
  [',', TokenType.COMMA],
  ['.', TokenType.DOT],
  ['?', TokenType.TERNARY],
  ['+', TokenType.PLUS],
  ['-', TokenType.MINUS],
  ['*', TokenType.MULTIPLY],
  ['%', TokenType.MODULO],
]);

/**
 * Lexer class for Pine Script v6
 *
 * Usage:
 * ```typescript
 * const lexer = new Lexer(sourceCode);
 * const tokens = lexer.tokenize();
 * ```
 */
export class Lexer {
  private source: string;
  private pos: number = 0;           // Current position in source
  private line: number = 1;          // Current line number (1-indexed)
  private column: number = 1;        // Current column number (1-indexed)
  private tokens: Token[] = [];      // Accumulated tokens
  private errors: LexerError[] = []; // Accumulated lexical errors
  private currentIndent: number = 0; // Current line's indentation level
  private atLineStart: boolean = true; // Whether we're at the start of a line
  private tabWidth: number = 4;      // Configurable tab width

  constructor(source: string, options?: { tabWidth?: number }) {
    this.source = source;
    if (options?.tabWidth) {
      this.tabWidth = options.tabWidth;
    }
  }

  /**
   * Tokenize the source code into a list of tokens
   * @returns Array of tokens including EOF token at the end
   */
  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      this.scanToken();
    }
    this.addToken(TokenType.EOF, '', 0);
    return this.tokens;
  }

  /**
   * Get all lexical errors encountered during tokenization
   * @returns Array of lexical errors
   */
  getErrors(): LexerError[] {
    return this.errors;
  }

  /**
   * Report a lexical error
   * @param message - Error message
   * @param length - Length of the error token
   */
  private reportError(message: string, length: number = 1): void {
    this.errors.push({
      message,
      line: this.line,
      column: this.column - length,
      length,
    });
  }

  private scanToken(): void {
    const start = this.pos;
    const char = this.advance();

    // Check for single-character tokens first
    const singleCharType = SINGLE_CHAR_TOKENS.get(char);
    if (singleCharType) {
      this.addToken(singleCharType, char, 1);
      return;
    }

    switch (char) {
      case ' ':
      case '\t':
        // Count indentation at line start
        if (this.atLineStart) {
          this.currentIndent += (char === '\t' ? this.tabWidth : 1);
        }
        break;

      case '\r':
        // Skip carriage return
        break;

      case '\n':
        this.addToken(TokenType.NEWLINE, '\n', 1);
        this.line++;
        this.column = 1;
        this.atLineStart = true;
        this.currentIndent = 0;
        break;

      case '/':
        if (this.peek() === '/') {
          this.scanComment();
        } else if (this.peek() === '*') {
          this.scanBlockComment();
        } else {
          this.addToken(TokenType.DIVIDE, '/', 1);
        }
        break;

      case ':':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.ASSIGN, ':=', 2);
        } else {
          this.addToken(TokenType.COLON, ':', 1);
        }
        break;

      case '=':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.COMPARE, '==', 2);
        } else if (this.peek() === '>') {
          this.advance();
          this.addToken(TokenType.ARROW, '=>', 2);
        } else {
          this.addToken(TokenType.ASSIGN, '=', 1);
        }
        break;

      case '!':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.COMPARE, '!=', 2);
        } else {
          // Pine Script uses 'not' keyword, not '!' operator
          this.reportError("Unexpected character '!'. Pine Script uses 'not' keyword instead.", 1);
          this.addToken(TokenType.ERROR, '!', 1);
        }
        break;

      case '<':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.COMPARE, '<=', 2);
        } else {
          this.addToken(TokenType.COMPARE, '<', 1);
        }
        break;

      case '>':
        if (this.peek() === '=') {
          this.advance();
          this.addToken(TokenType.COMPARE, '>=', 2);
        } else {
          this.addToken(TokenType.COMPARE, '>', 1);
        }
        break;

      case '#':
        // Check for hex color literal (#RRGGBB or #RRGGBBAA)
        this.scanHexColor();
        break;

      case '"':
      case "'":
        this.scanString(char);
        break;

      default:
        if (this.isDigit(char)) {
          this.scanNumber();
        } else if (this.isAlpha(char)) {
          this.scanIdentifier();
        }
        break;
    }
  }

  private scanComment(): void {
    const start = this.pos - 1;

    // Advance past the second '/'
    this.advance();

    // Check for annotation (//@version=6)
    if (this.peek() === '@') {
      while (this.peek() !== '\n' && !this.isAtEnd()) {
        this.advance();
      }
      const value = this.source.substring(start, this.pos);
      this.addToken(TokenType.ANNOTATION, value, value.length);
      return;
    }

    // Regular comment
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
    const value = this.source.substring(start, this.pos);
    this.addToken(TokenType.COMMENT, value, value.length);
  }

  private scanBlockComment(): void {
    const start = this.pos - 1;
    const startLine = this.line;
    const startColumn = this.column - 1;
    this.advance(); // consume *

    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // *
        this.advance(); // /
        break;
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;  // Reset to 1 (1-indexed), advance() will increment it
      }
      this.advance();
    }

    const value = this.source.substring(start, this.pos);
    this.addTokenWithPosition(TokenType.COMMENT, value, startLine, startColumn, this.line, this.column);
  }

  /**
   * Scan a string literal (single or double quoted)
   * Handles escape sequences like \n, \t, \", \'
   * Supports multi-line strings and Unicode characters (including Chinese)
   *
   * @param quote - The quote character (' or ")
   */
  private scanString(quote: string): void {
    const start = this.pos - 1; // Include the opening quote
    const startLine = this.line;
    const startColumn = this.column - 1;

    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === '\\') { // Handle escaped characters
        this.advance(); // Consume the backslash
        if (!this.isAtEnd()) {
          this.advance(); // Consume the escaped character
        }
      } else if (char === quote) { // Found the closing quote (unescaped)
        break;
      } else {
        if (char === '\n') {
          this.line++;
          this.column = 1;  // Reset to 1 (1-indexed), advance() will increment it
        }
        this.advance(); // Consume regular character
      }
    }

    if (!this.isAtEnd()) {
      this.advance(); // Consume the closing quote
    }

    const value = this.source.substring(start, this.pos);
    this.addTokenWithPosition(TokenType.STRING, value, startLine, startColumn, this.line, this.column);
  }

  /**
   * Scan a number literal
   * Supports:
   * - Integers: 123, 0, 999
   * - Floats: 3.14, 0.5
   * - Scientific notation: 1.5e10, 2.5e-5, 1E+3
   */
  private scanNumber(): void {
    const start = this.pos - 1;

    // Integer part
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Decimal part (only if followed by digit to avoid confusion with member access)
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // consume '.'
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    // Scientific notation (e or E)
    if (this.peek() === 'e' || this.peek() === 'E') {
      this.advance();
      // Optional sign
      if (this.peek() === '+' || this.peek() === '-') {
        this.advance();
      }
      // Exponent digits
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = this.source.substring(start, this.pos);
    this.addToken(TokenType.NUMBER, value, value.length);
  }

  /**
   * Scan a hexadecimal color literal
   * Valid formats:
   * - #RRGGBB (6 hex digits) - RGB color
   * - #RRGGBBAA (8 hex digits) - RGB with alpha/transparency
   *
   * Invalid formats (< 6 or 7 digits, or > 8) are treated as identifiers
   */
  private scanHexColor(): void {
    const start = this.pos - 1;  // Include the '#'

    // Count hex digits after #
    let hexCount = 0;
    while (this.isHexDigit(this.peek()) && hexCount < 8) {
      this.advance();
      hexCount++;
    }

    // Valid hex colors are #RRGGBB (6 digits) or #RRGGBBAA (8 digits)
    if (hexCount === 6 || hexCount === 8) {
      const value = this.source.substring(start, this.pos);
      this.addToken(TokenType.COLOR, value, value.length);
    } else {
      // Invalid hex color - treat as identifier for error recovery
      while (this.isAlphaNumeric(this.peek())) {
        this.advance();
      }
      const value = this.source.substring(start, this.pos);
      this.addToken(TokenType.IDENTIFIER, value, value.length);
    }
  }

  /**
   * Scan an identifier or keyword
   * Identifiers must start with a letter or underscore, followed by
   * letters, digits, or underscores.
   *
   * Special handling:
   * - 'true' and 'false' are recognized as BOOL tokens
   * - Reserved keywords are recognized as KEYWORD tokens
   * - Everything else is an IDENTIFIER
   */
  private scanIdentifier(): void {
    const start = this.pos - 1;

    // Consume identifier characters (letters, digits, underscores)
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      this.advance();
    }

    const value = this.source.substring(start, this.pos);

    // Check for boolean literals first (before keywords)
    if (value === 'true' || value === 'false') {
      this.addToken(TokenType.BOOL, value, value.length);
    } else if (KEYWORDS.has(value)) {
      this.addToken(TokenType.KEYWORD, value, value.length);
    } else {
      this.addToken(TokenType.IDENTIFIER, value, value.length);
    }
  }

  private advance(): string {
    const char = this.source.charAt(this.pos);
    this.pos++;
    this.column++;
    return char;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.pos);
  }

  private peekNext(): string {
    if (this.pos + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.pos + 1);
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isHexDigit(char: string): boolean {
    return (char >= '0' && char <= '9') ||
           (char >= 'a' && char <= 'f') ||
           (char >= 'A' && char <= 'F');
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private addToken(type: TokenType, value: string, length: number): void {
    // Mark that we're no longer at the start of the line (except for NEWLINE tokens)
    if (type !== TokenType.NEWLINE && type !== TokenType.WHITESPACE && this.atLineStart) {
      this.atLineStart = false;
    }

    const startColumn = this.column - length;
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: startColumn,
      length,
      indent: this.currentIndent,  // Record the indentation of the line containing this token
      endLine: this.line,
      endColumn: this.column,
    });
  }

  /**
   * Add a token with explicit start and end positions (for multi-line tokens)
   */
  private addTokenWithPosition(
    type: TokenType,
    value: string,
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number
  ): void {
    if (type !== TokenType.NEWLINE && type !== TokenType.WHITESPACE && this.atLineStart) {
      this.atLineStart = false;
    }

    this.tokens.push({
      type,
      value,
      line: startLine,
      column: startColumn,
      length: value.length,
      indent: this.currentIndent,
      endLine,
      endColumn,
    });
  }
}
