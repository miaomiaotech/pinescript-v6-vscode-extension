"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = exports.TokenType = void 0;
// Pine Script v6 Lexer/Tokenizer
var TokenType;
(function (TokenType) {
    // Literals
    TokenType["NUMBER"] = "NUMBER";
    TokenType["STRING"] = "STRING";
    TokenType["BOOL"] = "BOOL";
    TokenType["COLOR"] = "COLOR";
    // Identifiers and Keywords
    TokenType["IDENTIFIER"] = "IDENTIFIER";
    TokenType["KEYWORD"] = "KEYWORD";
    // Operators
    TokenType["ASSIGN"] = "ASSIGN";
    TokenType["PLUS"] = "PLUS";
    TokenType["MINUS"] = "MINUS";
    TokenType["MULTIPLY"] = "MULTIPLY";
    TokenType["DIVIDE"] = "DIVIDE";
    TokenType["MODULO"] = "MODULO";
    TokenType["COMPARE"] = "COMPARE";
    TokenType["LOGICAL"] = "LOGICAL";
    TokenType["TERNARY"] = "TERNARY";
    // Delimiters
    TokenType["LPAREN"] = "LPAREN";
    TokenType["RPAREN"] = "RPAREN";
    TokenType["LBRACKET"] = "LBRACKET";
    TokenType["RBRACKET"] = "RBRACKET";
    TokenType["COMMA"] = "COMMA";
    TokenType["DOT"] = "DOT";
    TokenType["COLON"] = "COLON";
    TokenType["ARROW"] = "ARROW";
    // Special
    TokenType["NEWLINE"] = "NEWLINE";
    TokenType["COMMENT"] = "COMMENT";
    TokenType["ANNOTATION"] = "ANNOTATION";
    TokenType["EOF"] = "EOF";
    TokenType["WHITESPACE"] = "WHITESPACE";
})(TokenType || (exports.TokenType = TokenType = {}));
var KEYWORDS = new Set([
    'if', 'else', 'for', 'while', 'break', 'continue', 'return',
    'var', 'varip', 'const',
    'na',
    'export', 'import', 'as',
    'switch', 'case', 'default',
    'type', // Pine Script v6 custom type definitions
    'and', 'or', 'not',
    'int', 'float', 'bool', 'string', 'color', 'line', 'label',
    'box', 'table', 'array', 'matrix', 'map',
    'series', 'simple', 'input',
    'to',
]);
var BUILTIN_FUNCTIONS = new Set([
    'indicator', 'strategy', 'library',
    'plot', 'plotshape', 'plotchar', 'plotcandle', 'plotbar',
    'hline', 'bgcolor', 'barcolor', 'fill',
    'label', 'line', 'box', 'table',
    'alert', 'alertcondition',
]);
var Lexer = /** @class */ (function () {
    function Lexer(source) {
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
        this.currentIndent = 0; // Track current line's indentation
        this.atLineStart = true; // Track if we're at the start of a line
        this.source = source;
    }
    Lexer.prototype.tokenize = function () {
        while (this.pos < this.source.length) {
            this.scanToken();
        }
        this.addToken(TokenType.EOF, '', 0);
        return this.tokens;
    };
    Lexer.prototype.scanToken = function () {
        var start = this.pos;
        var startColumn = this.column;
        var char = this.advance();
        switch (char) {
            case ' ':
            case '\t':
                // Count indentation at line start
                if (this.atLineStart) {
                    this.currentIndent += (char === '\t' ? 4 : 1);
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
            case '(':
                this.addToken(TokenType.LPAREN, '(', 1);
                break;
            case ')':
                this.addToken(TokenType.RPAREN, ')', 1);
                break;
            case '[':
                this.addToken(TokenType.LBRACKET, '[', 1);
                break;
            case ']':
                this.addToken(TokenType.RBRACKET, ']', 1);
                break;
            case ',':
                this.addToken(TokenType.COMMA, ',', 1);
                break;
            case '.':
                this.addToken(TokenType.DOT, '.', 1);
                break;
            case '?':
                this.addToken(TokenType.TERNARY, '?', 1);
                break;
            case '+':
                this.addToken(TokenType.PLUS, '+', 1);
                break;
            case '-':
                this.addToken(TokenType.MINUS, '-', 1);
                break;
            case '*':
                this.addToken(TokenType.MULTIPLY, '*', 1);
                break;
            case '%':
                this.addToken(TokenType.MODULO, '%', 1);
                break;
            case '/':
                if (this.peek() === '/') {
                    this.scanComment();
                }
                else if (this.peek() === '*') {
                    this.scanBlockComment();
                }
                else {
                    this.addToken(TokenType.DIVIDE, '/', 1);
                }
                break;
            case ':':
                if (this.peek() === '=') {
                    this.advance();
                    this.addToken(TokenType.ASSIGN, ':=', 2);
                }
                else {
                    this.addToken(TokenType.COLON, ':', 1);
                }
                break;
            case '=':
                if (this.peek() === '=') {
                    this.advance();
                    this.addToken(TokenType.COMPARE, '==', 2);
                }
                else if (this.peek() === '>') {
                    this.advance();
                    this.addToken(TokenType.ARROW, '=>', 2);
                }
                else {
                    this.addToken(TokenType.ASSIGN, '=', 1);
                }
                break;
            case '!':
                if (this.peek() === '=') {
                    this.advance();
                    this.addToken(TokenType.COMPARE, '!=', 2);
                }
                break;
            case '<':
                if (this.peek() === '=') {
                    this.advance();
                    this.addToken(TokenType.COMPARE, '<=', 2);
                }
                else {
                    this.addToken(TokenType.COMPARE, '<', 1);
                }
                break;
            case '>':
                if (this.peek() === '=') {
                    this.advance();
                    this.addToken(TokenType.COMPARE, '>=', 2);
                }
                else {
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
                }
                else if (this.isAlpha(char)) {
                    this.scanIdentifier();
                }
                break;
        }
    };
    Lexer.prototype.scanComment = function () {
        var start = this.pos - 1;
        var startColumn = this.column - 1;
        // Advance past the second '/'
        this.advance();
        // Check for annotation (//@version=6)
        if (this.peek() === '@') {
            while (this.peek() !== '\n' && !this.isAtEnd()) {
                this.advance();
            }
            var value_1 = this.source.substring(start, this.pos);
            this.addToken(TokenType.ANNOTATION, value_1, value_1.length);
            return;
        }
        // Regular comment
        while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
        }
        var value = this.source.substring(start, this.pos);
        this.addToken(TokenType.COMMENT, value, value.length);
    };
    Lexer.prototype.scanBlockComment = function () {
        var start = this.pos - 1;
        this.advance(); // consume *
        while (!this.isAtEnd()) {
            if (this.peek() === '*' && this.peekNext() === '/') {
                this.advance(); // *
                this.advance(); // /
                break;
            }
            if (this.peek() === '\n') {
                this.line++;
                this.column = 0;
            }
            this.advance();
        }
        var value = this.source.substring(start, this.pos);
        this.addToken(TokenType.COMMENT, value, value.length);
    };
    Lexer.prototype.scanString = function (quote) {
        var start = this.pos - 1;
        while (this.peek() !== quote && !this.isAtEnd()) {
            if (this.peek() === '\\') {
                this.advance(); // Skip escape char
                this.advance(); // Skip next char
            }
            else {
                if (this.peek() === '\n') {
                    this.line++;
                    this.column = 0;
                }
                this.advance();
            }
        }
        if (!this.isAtEnd()) {
            this.advance(); // Closing quote
        }
        var value = this.source.substring(start, this.pos);
        this.addToken(TokenType.STRING, value, value.length);
    };
    Lexer.prototype.scanNumber = function () {
        var start = this.pos - 1;
        while (this.isDigit(this.peek())) {
            this.advance();
        }
        // Decimal part
        if (this.peek() === '.' && this.isDigit(this.peekNext())) {
            this.advance(); // .
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }
        // Scientific notation
        if (this.peek() === 'e' || this.peek() === 'E') {
            this.advance();
            if (this.peek() === '+' || this.peek() === '-') {
                this.advance();
            }
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }
        var value = this.source.substring(start, this.pos);
        this.addToken(TokenType.NUMBER, value, value.length);
    };
    Lexer.prototype.scanHexColor = function () {
        var start = this.pos - 1; // Include the '#'
        // Count hex digits after #
        var hexCount = 0;
        while (this.isHexDigit(this.peek()) && hexCount < 8) {
            this.advance();
            hexCount++;
        }
        // Valid hex colors are #RRGGBB (6 digits) or #RRGGBBAA (8 digits)
        if (hexCount === 6 || hexCount === 8) {
            var value = this.source.substring(start, this.pos);
            this.addToken(TokenType.COLOR, value, value.length);
        }
        else {
            // Invalid hex color - treat as error or identifier
            // For now, just consume it as an identifier-like token
            while (this.isAlphaNumeric(this.peek())) {
                this.advance();
            }
            var value = this.source.substring(start, this.pos);
            this.addToken(TokenType.IDENTIFIER, value, value.length);
        }
    };
    Lexer.prototype.scanIdentifier = function () {
        var start = this.pos - 1;
        while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
            this.advance();
        }
        var value = this.source.substring(start, this.pos);
        // Check for boolean literals first (before keywords)
        if (value === 'true' || value === 'false') {
            this.addToken(TokenType.BOOL, value, value.length);
        }
        else if (KEYWORDS.has(value)) {
            this.addToken(TokenType.KEYWORD, value, value.length);
        }
        else {
            this.addToken(TokenType.IDENTIFIER, value, value.length);
        }
    };
    Lexer.prototype.advance = function () {
        var char = this.source.charAt(this.pos);
        this.pos++;
        this.column++;
        return char;
    };
    Lexer.prototype.peek = function () {
        if (this.isAtEnd())
            return '\0';
        return this.source.charAt(this.pos);
    };
    Lexer.prototype.peekNext = function () {
        if (this.pos + 1 >= this.source.length)
            return '\0';
        return this.source.charAt(this.pos + 1);
    };
    Lexer.prototype.isAtEnd = function () {
        return this.pos >= this.source.length;
    };
    Lexer.prototype.isDigit = function (char) {
        return char >= '0' && char <= '9';
    };
    Lexer.prototype.isHexDigit = function (char) {
        return (char >= '0' && char <= '9') ||
            (char >= 'a' && char <= 'f') ||
            (char >= 'A' && char <= 'F');
    };
    Lexer.prototype.isAlpha = function (char) {
        return (char >= 'a' && char <= 'z') ||
            (char >= 'A' && char <= 'Z') ||
            char === '_';
    };
    Lexer.prototype.isAlphaNumeric = function (char) {
        return this.isAlpha(char) || this.isDigit(char);
    };
    Lexer.prototype.addToken = function (type, value, length) {
        // Mark that we're no longer at the start of the line (except for NEWLINE tokens)
        if (type !== TokenType.NEWLINE && type !== TokenType.WHITESPACE && this.atLineStart) {
            this.atLineStart = false;
        }
        this.tokens.push({
            type: type,
            value: value,
            line: this.line,
            column: this.column - length,
            length: length,
            indent: this.atLineStart ? undefined : this.currentIndent, // Only set indent for non-line-start tokens
        });
    };
    return Lexer;
}());
exports.Lexer = Lexer;
