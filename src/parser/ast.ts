// Abstract Syntax Tree definitions for Pine Script v6
import { Range } from 'vscode';

export interface ASTNode {
  type: string;
  line: number;
  column: number;
  range: Range;
}

export interface Program extends ASTNode {
  type: 'Program';
  body: Statement[];
}

export type Statement =
  | VariableDeclaration
  | DestructuringAssignment
  | AssignmentStatement
  | FunctionDeclaration
  | ExpressionStatement
  | IfStatement
  | ForStatement
  | WhileStatement
  | ReturnStatement;

export interface VariableDeclaration extends ASTNode {
  type: 'VariableDeclaration';
  name: string;
  nameLine: number;
  nameColumn: number;
  varType: 'var' | 'varip' | 'const' | null;
  init: Expression | null;
  typeAnnotation?: TypeAnnotation;
}

export interface DestructuringVariable {
  name: string;
  line: number;
  column: number;
}

export interface DestructuringAssignment extends ASTNode {
  type: 'DestructuringAssignment';
  names: string[]; // Array of variable names: [kdj_top, kdj_bottom]
  variables: DestructuringVariable[]; // Array with position info for each variable
  init: Expression; // Right-hand side expression
}

export interface AssignmentStatement extends ASTNode {
  type: 'AssignmentStatement';
  name: string; // Variable name being assigned
  nameLine: number;
  nameColumn: number;
  value: Expression; // Right-hand side expression
}

export interface FunctionDeclaration extends ASTNode {
  type: 'FunctionDeclaration';
  name: string;
  params: FunctionParam[];
  body: Statement[];
  returnType?: TypeAnnotation;
  isExport?: boolean;
}

export interface FunctionParam {
  name: string;
  line: number;
  column: number;
  typeAnnotation?: TypeAnnotation;
  defaultValue?: Expression;
}

export interface TypeAnnotation {
  name: string; // int, float, bool, string, color, etc.
  qualifier?: string; // series, simple, input, const
}

export interface ExpressionStatement extends ASTNode {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface IfStatement extends ASTNode {
  type: 'IfStatement';
  condition: Expression;
  consequent: Statement[];
  alternate?: Statement[];
}

export interface ForStatement extends ASTNode {
  type: 'ForStatement';
  iterator: string;
  from: Expression;
  to: Expression;
  body: Statement[];
}

export interface WhileStatement extends ASTNode {
  type: 'WhileStatement';
  condition: Expression;
  body: Statement[];
}

export interface ReturnStatement extends ASTNode {
  type: 'ReturnStatement';
  value: Expression;
}

export type Expression =
  | Identifier
  | Literal
  | CallExpression
  | MemberExpression
  | BinaryExpression
  | UnaryExpression
  | TernaryExpression
  | ArrayExpression
  | IndexExpression;

export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}

export interface Literal extends ASTNode {
  type: 'Literal';
  value: string | number | boolean;
  raw: string;
}

export interface CallExpression extends ASTNode {
  type: 'CallExpression';
  callee: Expression;
  arguments: CallArgument[];
}

export interface CallArgument {
  name?: string; // For named arguments like style=shape.circle
  value: Expression;
}

export interface MemberExpression extends ASTNode {
  type: 'MemberExpression';
  object: Expression;
  property: Identifier;
}

export interface BinaryExpression extends ASTNode {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends ASTNode {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
}

export interface TernaryExpression extends ASTNode {
  type: 'TernaryExpression';
  condition: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface ArrayExpression extends ASTNode {
  type: 'ArrayExpression';
  elements: Expression[];
}

export interface IndexExpression extends ASTNode {
  type: 'IndexExpression';
  object: Expression;
  index: Expression;
}
