// Simple Pine Script Parser (focused on function call validation)
import { Position, Range } from 'vscode';
import { Token, TokenType, Lexer } from './lexer';
import * as AST from './ast';

export interface ParserError {
  message: string;
  line: number;
  column: number;
  token?: Token;
}

// Type keywords used in multiple places
const TYPE_KEYWORDS = ['int', 'float', 'bool', 'string', 'color', 'line', 'label',
                       'box', 'table', 'array', 'matrix', 'map'] as const;

// Type qualifiers
const TYPE_QUALIFIERS = ['series', 'simple', 'input', 'const'] as const;

export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private errors: ParserError[] = [];

  constructor(source: string) {
    const lexer = new Lexer(source);
    this.tokens = lexer.tokenize().filter(t =>
      t.type !== TokenType.WHITESPACE &&
      t.type !== TokenType.COMMENT
    );
  }

  /**
   * Get all parsing errors encountered
   */
  getErrors(): ParserError[] {
    return this.errors;
  }

  /**
   * Report a parsing error
   */
  private reportError(message: string, token?: Token): void {
    const errorToken = token || this.peek();
    this.errors.push({
      message,
      line: errorToken.line,
      column: errorToken.column,
      token: errorToken,
    });
  }

  parse(): AST.Program {
    const body: AST.Statement[] = [];
    const startToken = this.peek();

    while (!this.isAtEnd()) {
      try {
        const stmt = this.statement();
        if (stmt) body.push(stmt);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        this.reportError(errorMsg);
        this.synchronize();
      }
    }

    const endToken = this.previous();

    return {
      type: 'Program',
      body,
      line: 1,
      column: 1,
      range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
    };
  }

  private statement(): AST.Statement | null {
    // Skip newlines at statement level
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
      return null;
    }

    // Skip annotations
    if (this.check(TokenType.ANNOTATION)) {
      this.advance();
      return null;
    }

    // If statement
    if (this.match([TokenType.KEYWORD, ['if']])) {
      const startToken = this.previous();
      return this.ifStatement(startToken);
    }

    // For statement
    if (this.match([TokenType.KEYWORD, ['for']])) {
      const startToken = this.previous();
      return this.forStatement(startToken);
    }

    // While statement
    if (this.match([TokenType.KEYWORD, ['while']])) {
      const startToken = this.previous();
      return this.whileStatement(startToken);
    }

    // Return statement
    if (this.match([TokenType.KEYWORD, ['return']])) {
      const startToken = this.previous();
      return this.returnStatement(startToken);
    }

    // Variable declaration with optional type annotation:
    // var name = expr
    // varip name = expr
    // const name = expr
    // var float name = expr
    // int name = expr
    // float name = expr
    const varStartToken = this.peek();
    if (this.match([TokenType.KEYWORD, ['var', 'varip', 'const']])) {
      const varKeyword = this.previous().value as any;

      // Check if next token is also a type keyword (e.g., var float x = 1.0)
      if (this.check([TokenType.KEYWORD, [...TYPE_KEYWORDS]])) {
        this.advance(); // consume type keyword
      }

      return this.variableDeclaration(varKeyword, varStartToken);
    }

    // Type-annotated variable declaration without var: int x = 1, float y = 2.0
    if (this.check([TokenType.KEYWORD, [...TYPE_KEYWORDS]])) {
      const checkpoint = this.current;
      this.advance(); // consume type keyword

      // Check if next token is identifier followed by =
      if (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.ASSIGN) {
        // This is a type-annotated variable declaration
        this.current = checkpoint; // backtrack to let variableDeclaration handle it
        const startToken = this.peek();
        this.advance(); // re-consume type keyword
        return this.variableDeclaration(null, startToken);
      }

      // Not a variable declaration, backtrack
      this.current = checkpoint;
    }

    // Check for function definition: [export] name(params) =>
    const funcDeclCheckpoint = this.current;
    let isExport = false;
    if (this.match([TokenType.KEYWORD, ['export']])) {
      isExport = true;
    }

    if (this.check(TokenType.IDENTIFIER)) {
      const nameToken = this.advance();

      if (this.match(TokenType.LPAREN)) {
        try {
          const params = this.parseFunctionParams();
          this.consume(TokenType.RPAREN, 'Expected ")" after function parameters');

          if (this.match(TokenType.ARROW)) {
            // It's a function definition!
            const startToken = this.tokens[funcDeclCheckpoint];
            return this.functionDeclaration(nameToken, params, isExport, startToken);
          }

          // No arrow after ), not a function definition, backtrack
          this.current = funcDeclCheckpoint;
        } catch (e) {
          // Not a function definition, backtrack
          this.current = funcDeclCheckpoint;
        }
      } else {
        // Not a function call, backtrack
        this.current = funcDeclCheckpoint;
      }
    } else {
        // No identifier after optional export, backtrack
        this.current = funcDeclCheckpoint;
    }

    // Check if it's an identifier followed by = or := or compound assignment
    const nextTokenType = this.peekNext()?.type;
    if (this.check(TokenType.IDENTIFIER) && (nextTokenType === TokenType.ASSIGN || nextTokenType === TokenType.COMPOUND_ASSIGN)) {
      const nameToken = this.peek();
      this.advance(); // consume identifier
      const assignToken = this.advance(); // consume = or := or compound assignment

      // If it's a compound assignment (+=, -=, *=, /=, %=)
      if (assignToken.type === TokenType.COMPOUND_ASSIGN) {
        const value = this.expression();
        const endToken = this.previous();
        return {
          type: 'CompoundAssignmentStatement',
          name: nameToken.value,
          nameLine: nameToken.line,
          nameColumn: nameToken.column,
          operator: assignToken.value,
          value,
          line: nameToken.line,
          column: nameToken.column,
          range: new Range(this.tokenRange(nameToken).start, this.tokenRange(endToken).end),
        };
      }

      // If it's :=, this is reassignment (not declaration)
      if (assignToken.value === ':=') {
        const value = this.expression();
        const endToken = this.previous();
        return {
          type: 'AssignmentStatement',
          name: nameToken.value,
          nameLine: nameToken.line,
          nameColumn: nameToken.column,
          value,
          line: nameToken.line,
          column: nameToken.column,
          range: new Range(this.tokenRange(nameToken).start, this.tokenRange(endToken).end),
        };
      }

      // If it's =, this is a variable declaration
      // Backtrack and let variableDeclaration handle it
      this.current -= 2;
      const startToken = this.peek();
      return this.variableDeclaration(null, startToken);
    }

    // Check for destructuring assignment: [name1, name2] = expr
    if (this.check(TokenType.LBRACKET)) {
      const checkpoint = this.current;
      try {
        const startToken = this.peek();
        this.advance(); // consume [

        // Try to parse identifier list with position info
        const names: string[] = [];
        const variables: AST.DestructuringVariable[] = [];
        if (!this.check(TokenType.RBRACKET)) {
          do {
            if (this.check(TokenType.IDENTIFIER)) {
              const nameToken = this.advance();
              names.push(nameToken.value);
              variables.push({
                name: nameToken.value,
                line: nameToken.line,
                column: nameToken.column,
              });
            } else {
              throw new Error('Expected identifier in destructuring pattern');
            }
          } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RBRACKET, 'Expected "]" in destructuring pattern');

        // Check for = after the pattern (NOT :=, only =)
        if (this.check(TokenType.ASSIGN)) {
          const assignToken = this.advance();
          // Destructuring assignment only supports =, not :=
          if (assignToken.value !== '=') {
            // This is a syntax error, don't backtrack
            const errorMsg = `Mismatched input ":=" expecting "=" at line ${assignToken.line}`;
            this.reportError(errorMsg, assignToken);
            // Still try to parse as destructuring assignment to continue error checking
            return this.destructuringAssignment(names, variables, startToken);
          }
          // This is a destructuring assignment!
          return this.destructuringAssignment(names, variables, startToken);
        }

        // Not a destructuring assignment, backtrack
        this.current = checkpoint;
      } catch (e) {
        // Not a destructuring assignment, backtrack
        this.current = checkpoint;
      }
    }

    // Expression statement (function calls, etc.)
    return this.expressionStatement();
  }

  private variableDeclaration(varType: 'var' | 'varip' | 'const' | null, startToken: Token): AST.VariableDeclaration {
    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected variable name');

    let endToken = nameToken;
    let init: AST.Expression | null = null;
    if (this.match(TokenType.ASSIGN)) {
      init = this.expression();
      endToken = this.previous();
    }

    return {
      type: 'VariableDeclaration',
      name: nameToken.value,
      nameLine: nameToken.line,
      nameColumn: nameToken.column,
      varType,
      init,
      line: startToken.line,
      column: startToken.column,
      range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
    };
  }

  private destructuringAssignment(names: string[], variables: AST.DestructuringVariable[], startToken: Token): AST.DestructuringAssignment {
    const init = this.expression();
    const endToken = this.previous();

    return {
      type: 'DestructuringAssignment',
      names,
      variables,
      init,
      line: startToken.line,
      column: startToken.column,
      range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
    };
  }

  private expressionStatement(): AST.ExpressionStatement {
    const expr = this.expression();
    return {
      type: 'ExpressionStatement',
      expression: expr,
      line: expr.line,
      column: expr.column,
      range: expr.range,
    };
  }

  private ifStatement(startToken: Token): AST.IfStatement {
    const condition = this.expression();

    // Parse consequent block
    const consequent = this.parseIndentedBlock(startToken);

    let endToken = this.previous();
    let alternate: AST.Statement[] | undefined;

    if (this.match([TokenType.KEYWORD, ['else']])) {
      const elseToken = this.previous();

      // Check for "else if" - if so, parse as a single nested if statement
      if (this.check([TokenType.KEYWORD, ['if']])) {
        const ifToken = this.advance();
        const nestedIf = this.ifStatement(ifToken);
        alternate = [nestedIf];
        endToken = this.previous();
      } else {
        // Regular else block
        alternate = this.parseIndentedBlock(elseToken);
        endToken = this.previous();
      }
    }

    return {
      type: 'IfStatement',
      condition,
      consequent,
      alternate,
      line: startToken.line,
      column: startToken.column,
      range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
    };
  }

  private forStatement(startToken: Token): AST.ForStatement {
    const iterator = this.consume(TokenType.IDENTIFIER, 'Expected iterator variable').value;

    // Check for 'in' keyword (for-in loop) or '=' (traditional for loop)
    if (this.match([TokenType.KEYWORD, ['in']])) {
      // For-in loop: for item in array
      const iterable = this.expression();
      const body = this.parseIndentedBlock(startToken);
      const endToken = body.length > 0 ? this.previous() : this.tokens[this.current - 1];

      return {
        type: 'ForStatement',
        iterator,
        iterable,
        body,
        line: startToken.line,
        column: startToken.column,
        range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
      };
    } else {
      // Traditional for loop: for i = 0 to 10
      this.consume(TokenType.ASSIGN, 'Expected "=" in for loop');
      const from = this.expression();
      this.match([TokenType.KEYWORD, ['to']]); // optional 'to' keyword
      const to = this.expression();

      const body = this.parseIndentedBlock(startToken);
      const endToken = body.length > 0 ? this.previous() : this.tokens[this.current - 1];

      return {
        type: 'ForStatement',
        iterator,
        from,
        to,
        body,
        line: startToken.line,
        column: startToken.column,
        range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
      };
    }
  }

  private whileStatement(startToken: Token): AST.WhileStatement {
    const condition = this.expression();

    // Parse loop body
    const body = this.parseIndentedBlock(startToken);

    const endToken = body.length > 0 ? this.previous() : this.tokens[this.current - 1];

    return {
      type: 'WhileStatement',
      condition,
      body,
      line: startToken.line,
      column: startToken.column,
      range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
    };
  }

  private returnStatement(startToken: Token): AST.ReturnStatement {
    const value = this.expression();
    const endToken = this.previous();

    return {
      type: 'ReturnStatement',
      value,
      line: startToken.line,
      column: startToken.column,
      range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
    };
  }

  private functionDeclaration(nameToken: Token, params: AST.FunctionParam[], isExport: boolean, startToken: Token): AST.FunctionDeclaration {
    // Parse function body using indentation
    // In Pine Script, function bodies after => can be:
    // 1. Single expression: f(x) => x * 2
    // 2. Multi-line block with increased indentation:
    //    f(x) =>
    //        y = x * 2
    //        y + 1
    const body: AST.Statement[] = [];

    // Check if next token is on the same line (single-line function)
    const nextToken = this.peek();
    if (nextToken.type !== TokenType.NEWLINE && nextToken.line === startToken.line) {
      // Single-line function: same line as =>
      try {
        const expr = this.expression();
        body.push({
          type: 'ReturnStatement',
          value: expr,
          line: expr.line,
          column: expr.column,
          range: expr.range,
        } as AST.ReturnStatement);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        this.reportError(`Error parsing function body: ${errorMsg}`);
      }
    } else {
      // Multi-line function: parse all statements at deeper indentation
      body.push(...this.parseIndentedBlock(startToken));
    }

    const endToken = this.previous();

    return {
      type: 'FunctionDeclaration',
      name: nameToken.value,
      isExport,
      params,
      body,
      line: nameToken.line,
      column: nameToken.column,
      range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
    };
  }

  private parseFunctionParams(): AST.FunctionParam[] {
    const params: AST.FunctionParam[] = [];

    if (this.check(TokenType.RPAREN)) {
      return params; // No parameters
    }

    do {
      let qualifier: string | undefined = undefined;
      let typeName: string | undefined = undefined;

      // Check for qualifier (e.g., 'series', 'simple')
      if (this.check([TokenType.KEYWORD, [...TYPE_QUALIFIERS]])) {
        qualifier = this.advance().value;
      }

      // Check for type name (e.g., 'float', 'int', 'bool')
      if (this.check([TokenType.KEYWORD, [...TYPE_KEYWORDS]])) {
        typeName = this.advance().value;
      }

      // Now get the parameter name
      const paramName = this.consume(TokenType.IDENTIFIER, 'Expected parameter name');

      let typeAnnotation: AST.TypeAnnotation | undefined = undefined;
      if (typeName) {
        typeAnnotation = { name: typeName, qualifier: qualifier };
      } else if (qualifier) {
        // This handles cases where the qualifier is used as the type, e.g., `series indicator`
        typeAnnotation = { name: qualifier, qualifier: undefined };
      }

      // Check for default value
      let defaultValue: AST.Expression | undefined;
      if (this.match(TokenType.ASSIGN)) {
        defaultValue = this.expression();
      }

      params.push({
        name: paramName.value,
        line: paramName.line,
        column: paramName.column,
        typeAnnotation,
        defaultValue,
      });
    } while (this.match(TokenType.COMMA));

    return params;
  }

  private expression(): AST.Expression {
    return this.ternary();
  }

  private ternary(): AST.Expression {
    let expr = this.logicalOr();

    if (this.match(TokenType.TERNARY)) {
      const consequent = this.expression();
      this.consume(TokenType.COLON, 'Expected ":" in ternary expression');
      const alternate = this.expression();

      return {
        type: 'TernaryExpression',
        condition: expr,
        consequent,
        alternate,
        line: expr.line,
        column: expr.column,
        range: new Range(expr.range.start, alternate.range.end),
      };
    }

    return expr;
  }

  private logicalOr(): AST.Expression {
    let expr = this.logicalAnd();

    while (this.match([TokenType.KEYWORD, ['or']])) {
      const operator = this.previous().value;
      const right = this.logicalAnd();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        line: expr.line,
        column: expr.column,
        range: new Range(expr.range.start, right.range.end),
      };
    }

    return expr;
  }

  private logicalAnd(): AST.Expression {
    let expr = this.comparison();

    while (this.match([TokenType.KEYWORD, ['and']])) {
      const operator = this.previous().value;
      const right = this.comparison();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        line: expr.line,
        column: expr.column,
        range: new Range(expr.range.start, right.range.end),
      };
    }

    return expr;
  }

  private comparison(): AST.Expression {
    let expr = this.addition();

    while (this.match(TokenType.COMPARE)) {
      const operator = this.previous().value;
      const right = this.addition();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        line: expr.line,
        column: expr.column,
        range: new Range(expr.range.start, right.range.end),
      };
    }

    return expr;
  }

  private addition(): AST.Expression {
    let expr = this.multiplication();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value;
      const right = this.multiplication();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        line: expr.line,
        column: expr.column,
        range: new Range(expr.range.start, right.range.end),
      };
    }

    return expr;
  }

  private multiplication(): AST.Expression {
    let expr = this.unary();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const operator = this.previous().value;
      const right = this.unary();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
        line: expr.line,
        column: expr.column,
        range: new Range(expr.range.start, right.range.end),
      };
    }

    return expr;
  }

  private unary(): AST.Expression {
    if (this.match(TokenType.MINUS) || this.match([TokenType.KEYWORD, ['not']])) {
      const operatorToken = this.previous();
      const right = this.unary();
      return {
        type: 'UnaryExpression',
        operator: operatorToken.value,
        argument: right,
        line: operatorToken.line,
        column: operatorToken.column,
        range: new Range(this.tokenRange(operatorToken).start, right.range.end),
      };
    }

    return this.postfix();
  }

  private postfix(): AST.Expression {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LPAREN)) {
        // Function call
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        // Member access - property can be identifier or keyword (e.g., input.float)
        let property: Token;
        if (this.check(TokenType.IDENTIFIER)) {
          property = this.advance();
        } else if (this.check(TokenType.KEYWORD)) {
          property = this.advance();
        } else {
          throw new Error(`Expected property name at line ${this.peek().line}`);
        }
        
        const propertyIdentifier: AST.Identifier = {
          type: 'Identifier',
          name: property.value,
          line: property.line,
          column: property.column,
          range: this.tokenRange(property),
        };

        expr = {
          type: 'MemberExpression',
          object: expr,
          property: propertyIdentifier,
          line: expr.line,
          column: expr.column,
          range: new Range(expr.range.start, propertyIdentifier.range.end),
        };
      } else if (this.check(TokenType.LBRACKET)) {
        // array[index]
        this.advance(); // consume [
        const index = this.expression();
        const endToken = this.consume(TokenType.RBRACKET, 'Expected "]"');
        expr = {
          type: 'IndexExpression',
          object: expr,
          index,
          line: expr.line,
          column: expr.column,
          range: new Range(expr.range.start, this.tokenRange(endToken).end),
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: AST.Expression): AST.CallExpression {
    const args: AST.CallArgument[] = [];

    // Skip continuation newlines after opening paren
    this.skipContinuationNewlines(0);

    if (!this.check(TokenType.RPAREN)) {
      do {
        // Skip continuation newlines before each argument
        this.skipContinuationNewlines(0);

        // Check for named argument: name = value
        // Allow both IDENTIFIER and KEYWORD as parameter names (Pine Script uses keywords like 'color', 'title', etc. as parameter names)
        if ((this.check(TokenType.IDENTIFIER) || this.check(TokenType.KEYWORD)) && this.peekNext()?.type === TokenType.ASSIGN) {
          const name = this.advance().value;
          this.advance(); // consume =
          const value = this.expression();
          args.push({ name, value });
        } else {
          // Positional argument
          const value = this.expression();
          args.push({ value });
        }

        // Skip continuation newlines after argument
        this.skipContinuationNewlines(0);
      } while (this.match(TokenType.COMMA));
    }

    // Skip continuation newlines before closing paren
    this.skipContinuationNewlines(0);
    const endToken = this.consume(TokenType.RPAREN, 'Expected ")" after arguments');

    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      line: callee.line,
      column: callee.column,
      range: new Range(callee.range.start, this.tokenRange(endToken).end),
    };
  }

  private primary(): AST.Expression {
    // Literals
    if (this.match(TokenType.NUMBER)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: parseFloat(token.value),
        raw: token.value,
        line: token.line,
        column: token.column,
        range: this.tokenRange(token),
      };
    }

    if (this.match(TokenType.STRING)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: token.value,
        raw: token.value,
        line: token.line,
        column: token.column,
        range: this.tokenRange(token),
      };
    }

    if (this.match(TokenType.BOOL)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: token.value === 'true',
        raw: token.value,
        line: token.line,
        column: token.column,
        range: this.tokenRange(token),
      };
    }

    if (this.match(TokenType.COLOR)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: token.value,  // Keep hex color as string (e.g., "#d8e3ac")
        raw: token.value,
        line: token.line,
        column: token.column,
        range: this.tokenRange(token),
      };
    }

    // na keyword - represents "not available"
    if (this.match([TokenType.KEYWORD, ['na']])) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: 'na',
        raw: 'na',
        line: token.line,
        column: token.column,
        range: this.tokenRange(token),
      };
    }

    // Identifier
    if (this.match(TokenType.IDENTIFIER) || this.match(TokenType.KEYWORD)) {
      const token = this.previous();
      return {
        type: 'Identifier',
        name: token.value,
        line: token.line,
        column: token.column,
        range: this.tokenRange(token),
      };
    }

    // Grouping
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, 'Expected ")" after expression');
      return expr;
    }

    // Array literal
    if (this.match(TokenType.LBRACKET)) {
      const startToken = this.previous();
      const elements: AST.Expression[] = [];
      if (!this.check(TokenType.RBRACKET)) {
        do {
          elements.push(this.expression());
        } while (this.match(TokenType.COMMA));
      }
      const endToken = this.consume(TokenType.RBRACKET, 'Expected "]"');
      return {
        type: 'ArrayExpression',
        elements,
        line: startToken.line,
        column: startToken.column,
        range: new Range(this.tokenRange(startToken).start, this.tokenRange(endToken).end),
      };
    }

    throw new Error(`Unexpected token: ${this.peek().value}`);
  }

  private tokenRange(token: Token): Range {
    // Use endLine/endColumn if available (for multi-line tokens)
    if (token.endLine !== undefined && token.endColumn !== undefined) {
      const start = new Position(token.line - 1, token.column - 1);
      const end = new Position(token.endLine - 1, token.endColumn - 1);
      return new Range(start, end);
    }
    // Fallback to calculating from length
    const start = new Position(token.line - 1, token.column - 1);
    const end = new Position(token.line - 1, (token.column - 1) + token.value.length);
    return new Range(start, end);
  }

  /**
   * Parse an indented block of statements
   * Used by if/for/while/function to parse their bodies
   */
  private parseIndentedBlock(startToken: Token): AST.Statement[] {
    const body: AST.Statement[] = [];
    let blockIndent: number | null = null;

    while (!this.isAtEnd()) {
      const currentToken = this.peek();
      const currentIndent = currentToken.indent ?? 0;

      // Skip NEWLINE tokens
      if (currentToken.type === TokenType.NEWLINE) {
        this.advance();
        continue;
      }

      // Set expected block indentation from first statement
      if (blockIndent === null && currentToken.line > startToken.line) {
        blockIndent = currentIndent;
      }

      // Stop if we've returned to base indentation level or less
      if (blockIndent !== null && currentToken.line > startToken.line && currentIndent < blockIndent) {
        break;
      }

      // Stop at else keyword (for if statements)
      if (this.check([TokenType.KEYWORD, ['else']])) {
        break;
      }

      const stmt = this.statement();
      if (stmt) {
        body.push(stmt);
      } else {
        break;
      }
    }

    return body;
  }

  /**
   * Skip newlines that are line continuations (based on indentation)
   *
   * PineScript line wrapping rule:
   * A line is a continuation if its indentation is NOT a multiple of 4.
   * Multiples of 4 (0, 4, 8, 12, ...) are used for local blocks.
   * Non-multiples (1, 2, 3, 5, 6, 7, 9, ...) indicate line continuations.
   */
  private skipContinuationNewlines(baseIndent: number): void {
    while (this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      // Peek ahead to see the next non-newline token
      const nextNonNewlineIndex = this.findNextNonNewlineIndex();
      if (nextNonNewlineIndex === -1) {
        // No more tokens, don't skip
        break;
      }

      const nextToken = this.tokens[nextNonNewlineIndex];
      const nextIndent = nextToken.indent ?? 0;

      // Line continuation: indentation is NOT a multiple of 4
      if (nextIndent % 4 !== 0) {
        this.advance(); // skip the newline - this is a line continuation
      } else {
        // Indentation is a multiple of 4 - this is a new statement/block
        break;
      }
    }
  }

  /**
   * Find the index of the next non-newline token
   */
  private findNextNonNewlineIndex(): number {
    let index = this.current + 1;
    while (index < this.tokens.length) {
      if (this.tokens[index].type !== TokenType.NEWLINE) {
        return index;
      }
      index++;
    }
    return -1; // No non-newline token found
  }

  // Utility methods
  private match(...types: (TokenType | [TokenType, string[]])[]): boolean {
    for (const type of types) {
      if (Array.isArray(type)) {
        const [tokenType, values] = type;
        if (this.check(tokenType) && values.includes(this.peek().value)) {
          this.advance();
          return true;
        }
      } else {
        if (this.check(type)) {
          this.advance();
          return true;
        }
      }
    }
    return false;
  }

  private check(type: TokenType | [TokenType, string[]]): boolean {
    if (this.isAtEnd()) return false;
    if (Array.isArray(type)) {
      const [tokenType, values] = type;
      return this.peek().type === tokenType && values.includes(this.peek().value);
    }
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token | null {
    if (this.current + 1 >= this.tokens.length) return null;
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message} at line ${this.peek().line}`);
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      // Look for statement boundaries
      if (this.previous().type === TokenType.NEWLINE) return;

      switch (this.peek().type) {
        case TokenType.KEYWORD:
          if (['if', 'for', 'while', 'var', 'varip', 'const'].includes(this.peek().value)) {
            return;
          }
          break;
      }

      this.advance();
    }
  }
}
