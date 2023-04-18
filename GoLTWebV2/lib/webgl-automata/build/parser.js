import { parse } from "./parser_generated.js";
function isStatement(node) {
    return ['Declaration', 'Assignment', 'Conditional', 'Block'].includes(node.type);
}
function isExpression(node) {
    return ['Ternary', 'Binary', 'Unary', 'Cast', 'IntLiteral', 'FloatLiteral', 'BooleanLiteral', 'Access'].includes(node.type);
}
function typesEqual(t1, t2) {
    if (t1.type === 'Struct' && t2.type === 'Struct') {
        const t1Props = Object.keys(t1.properties);
        const t2Props = Object.keys(t2.properties);
        if (!t1Props.every((v, i) => t2Props[i] === v)) {
            return false;
        }
        for (const key of t1Props) {
            if (!typesEqual(t1.properties[key], t2.properties[key])) {
                return false;
            }
        }
        return true;
    }
    else {
        return t1.type === t2.type;
    }
}
function analyzeExpression(expr, scope) {
    expr.scope = scope;
    switch (expr.type) {
        case "Ternary":
            analyzeExpression(expr.test, scope);
            analyzeExpression(expr.consequent, scope);
            analyzeExpression(expr.alternate, scope);
            if (expr.test.expr_type.type !== 'Boolean') {
                throw new Error(`ternary condition can not be ${expr.test.expr_type.type}`);
            }
            if (!typesEqual(expr.consequent.expr_type, expr.alternate.expr_type)) {
                throw new Error(`ternary consequent and alternate must have the same type, got ${expr.consequent.expr_type.type} and ${expr.alternate.expr_type.type}`);
            }
            expr.expr_type = expr.consequent.expr_type;
            break;
        case "Binary":
            analyzeExpression(expr.left, scope);
            analyzeExpression(expr.right, scope);
            switch (expr.op) {
                case "||":
                case "&&":
                    if (!typesEqual(expr.left.expr_type, expr.right.expr_type)
                        || !['Boolean'].includes(expr.left.expr_type.type)) {
                        throw new Error(`operator ${expr.op} can not be used on types ${expr.left.expr_type.type} and ${expr.right.expr_type.type}`);
                    }
                    expr.expr_type = { type: 'Boolean' };
                    break;
                case "==":
                case "!=":
                    if (!typesEqual(expr.left.expr_type, expr.right.expr_type)) {
                        throw new Error(`operator ${expr.op} can not be used on types ${expr.left.expr_type.type} and ${expr.right.expr_type.type}`);
                    }
                    expr.expr_type = { type: 'Boolean' };
                    break;
                case "<=":
                case "<":
                case ">=":
                case ">":
                    if (!typesEqual(expr.left.expr_type, expr.right.expr_type)
                        || !['Float', 'Int'].includes(expr.left.expr_type.type)) {
                        throw new Error(`operator ${expr.op} can not be used on types ${expr.left.expr_type.type} and ${expr.right.expr_type.type}`);
                    }
                    expr.expr_type = { type: 'Boolean' };
                    break;
                case "+":
                case "-":
                case "*":
                case "/":
                    if (!typesEqual(expr.left.expr_type, expr.right.expr_type)
                        || !['Float', 'Int'].includes(expr.left.expr_type.type)) {
                        throw new Error(`operator ${expr.op} can not be used on types ${expr.left.expr_type.type} and ${expr.right.expr_type.type}`);
                    }
                    expr.expr_type = expr.left.expr_type;
                    break;
                case "%":
                    if (!typesEqual(expr.left.expr_type, expr.right.expr_type)
                        || !['Int'].includes(expr.left.expr_type.type)) {
                        throw new Error(`operator ${expr.op} can not be used on types ${expr.left.expr_type.type} and ${expr.right.expr_type.type}`);
                    }
                    expr.expr_type = expr.left.expr_type;
                    break;
            }
            break;
        case "Unary":
            analyzeExpression(expr.expr, scope);
            switch (expr.op) {
                case "!":
                    if (expr.expr.expr_type.type != 'Boolean') {
                        throw new Error(`operator ! can not be used on type ${expr.expr.expr_type.type}`);
                    }
                    expr.expr_type = expr.expr.expr_type;
                    break;
                case "-":
                    if (!['Float', 'Int'].includes(expr.expr.expr_type.type)) {
                        throw new Error(`operator - can not be used on type ${expr.expr.expr_type.type}`);
                    }
                    expr.expr_type = expr.expr.expr_type;
                    break;
            }
            break;
        case "Cast":
            analyzeExpression(expr.expr, scope);
            if (!['Int', 'Float', 'Boolean'].includes(expr.expr.expr_type.type)) {
                throw new Error(`can not cast ${expr.expr.expr_type.type} to ${expr.op}`);
            }
            switch (expr.op) {
                case "int":
                    expr.expr_type = { type: 'Int' };
                    break;
                case "float":
                    expr.expr_type = { type: 'Float' };
                    break;
                case "bool":
                    expr.expr_type = { type: 'Boolean' };
                    break;
            }
            break;
        case "IntLiteral":
            expr.expr_type = { type: 'Int' };
            break;
        case "FloatLiteral":
            expr.expr_type = { type: 'Float' };
            break;
        case "BooleanLiteral":
            expr.expr_type = { type: 'Boolean' };
            break;
        case "Access":
            expr.expr_type = getAccessType(scope, expr.path);
            break;
    }
}
function scopeWithVar(scope, name, type, node) {
    return {
        variables: {
            ...scope.variables,
            [name]: {
                type: type,
                declaration: node,
            }
        }
    };
}
function getAccessType(scope, access) {
    const entry = scope.variables[access[0]];
    if (typeof entry === 'undefined') {
        throw new Error(`${access[0]} is not defined`);
    }
    if (entry.type.type === 'Struct') {
        if (access.length === 1) {
            return entry.type;
        }
        else {
            let cur_type = entry.type;
            let path_name = access[0];
            for (let i = 1; i < access.length; i++) {
                const cur_name = access[i];
                if (cur_type.type !== 'Struct') {
                    throw new Error(`trying to access property ${access[1]} on ${entry.type.type}`);
                }
                const el_type = cur_type.properties[cur_name];
                if (typeof el_type === 'undefined') {
                    throw new Error(`${path_name} has no property ${cur_name}`);
                }
                path_name = `${path_name}.${cur_name}`;
                cur_type = el_type;
            }
            return cur_type;
        }
    }
    else {
        if (access.length > 1) {
            throw new Error(`trying to access property ${access[1]} on ${entry.type.type}`);
        }
        return entry.type;
    }
}
// TODO: every node should have a reference to its scope maybe?
function analyzeStatement(stmt, scope) {
    stmt.scope = scope;
    switch (stmt.type) {
        case "Block":
            let sc = scope;
            for (let s of stmt.body) {
                sc = analyzeStatement(s, sc);
            }
            return scope;
        case "Declaration":
            switch (stmt.typename) {
                case 'bool':
                    stmt.var_type = { type: 'Boolean' };
                    break;
                case 'int':
                    stmt.var_type = { type: 'Int' };
                    break;
                case 'float':
                    stmt.var_type = { type: 'Float' };
                    break;
                default:
                    throw new Error('not implemented');
            }
            if (stmt.init !== null) {
                analyzeExpression(stmt.init, scope);
                if (!typesEqual(stmt.init.expr_type, stmt.var_type)) {
                    throw new Error(`cannot initialise variable of type ${stmt.var_type.type} with value of type ${stmt.init.expr_type.type}`);
                }
            }
            return scopeWithVar(scope, stmt.name, stmt.var_type, stmt);
        case "Assignment":
            analyzeExpression(stmt.target, scope);
            analyzeExpression(stmt.value, scope);
            if (!typesEqual(stmt.target.expr_type, stmt.value.expr_type)) {
                throw new Error(`cannot assign value of type ${stmt.value.expr_type.type} to variable of type ${stmt.target.expr_type}`);
            }
            return scope;
        case "Conditional":
            analyzeExpression(stmt.test, scope);
            if (stmt.test.expr_type.type !== 'Boolean') {
                throw new Error(`conditional in if statement must be of type Boolean, got ${stmt.test.expr_type.type}`);
            }
            analyzeStatement(stmt.consequent, scope);
            if (stmt.alternate !== null) {
                analyzeStatement(stmt.alternate, scope);
            }
            return scope;
    }
}
function analyzeProgram(program, rootScope) {
    let scope = rootScope;
    program.scope = scope;
    for (const stmt of program.body) {
        scope = analyzeStatement(stmt, scope);
    }
}
export function typecheck(root, scope) {
    if (isExpression(root)) {
        analyzeExpression(root, scope);
    }
    else if (root.type === 'Program') {
        analyzeProgram(root, scope);
    }
    else {
        throw new Error(`invalid root node type ${root.type}`);
    }
}
export function parseExpression(source) {
    return parse(source, { startRule: "expression" });
}
export function parseProgram(source) {
    return parse(source, { startRule: "program" });
}
//# sourceMappingURL=parser.js.map