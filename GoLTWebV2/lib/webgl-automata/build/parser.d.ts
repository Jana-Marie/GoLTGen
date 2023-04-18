import { LocationRange } from "peggy";
export interface Node {
    type: string;
    loc: LocationRange;
    scope: Scope;
}
export interface Program extends Node {
    type: 'Program';
    body: Statement[];
}
export type Statement = Declaration | Assignment | Conditional | Block;
export interface Block extends Node {
    type: 'Block';
    body: Statement[];
}
export type Type = BooleanType | FloatType | IntType | StructType;
export interface StructType {
    type: 'Struct';
    properties: Record<string, Type>;
}
export interface BooleanType {
    type: 'Boolean';
}
export interface FloatType {
    type: 'Float';
}
export interface IntType {
    type: 'Int';
}
export interface TypedNode extends Node {
    expr_type: Type;
}
export interface Declaration extends Node {
    type: 'Declaration';
    name: string;
    init: Expression | null;
    typename: string;
    var_type: Type;
}
export interface Assignment extends Node {
    type: 'Assignment';
    target: Access;
    op: string;
    value: Expression;
}
export interface Conditional extends Node {
    type: 'Conditional';
    test: Expression;
    consequent: Statement;
    alternate: Statement | null;
}
export type Expression = Ternary | Binary | Unary | Cast | Literal | Access;
export interface Ternary extends TypedNode {
    type: 'Ternary';
    test: Expression;
    consequent: Expression;
    alternate: Expression;
}
export type BinaryOperator = '||' | '&&' | '==' | '!=' | '<=' | '<' | '>=' | '>' | '+' | '-' | '*' | '/' | '%';
export interface Binary extends TypedNode {
    type: 'Binary';
    left: Expression;
    right: Expression;
    op: BinaryOperator;
}
export type UnaryOperator = '!' | '-';
export interface Unary extends TypedNode {
    type: 'Unary';
    expr: Expression;
    op: UnaryOperator;
}
export type CastOperator = 'int' | 'float' | 'bool';
export interface Cast extends TypedNode {
    type: 'Cast';
    expr: Expression;
    op: CastOperator;
}
export type Literal = IntLiteral | FloatLiteral | BooleanLiteral;
export interface IntLiteral extends TypedNode {
    type: 'IntLiteral';
    value: number;
}
export interface FloatLiteral extends TypedNode {
    type: 'FloatLiteral';
    value: number;
}
export interface BooleanLiteral extends TypedNode {
    type: 'BooleanLiteral';
    value: boolean;
}
export interface Access extends TypedNode {
    type: 'Access';
    path: string[];
}
export interface Scope {
    variables: Record<string, ScopeEntry>;
}
export interface ScopeEntry {
    type: Type;
    declaration: Declaration | null;
}
export declare function typecheck(root: Expression | Program, scope: Scope): void;
export declare function parseExpression(source: string): Expression;
export declare function parseProgram(source: string): Program;
