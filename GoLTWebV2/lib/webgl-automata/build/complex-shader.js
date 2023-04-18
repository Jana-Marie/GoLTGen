import { parseExpression, parseProgram, typecheck } from "./parser.js";
function makeStateLayout(config) {
    let byte = 0;
    let bit = 0;
    const layout = {};
    for (let v of config) {
        if (v.type === 'flag') {
            layout[v.name] = {
                type: 'flag',
                byte: byte,
                bit: bit,
            };
            bit += 1;
            if (bit === 8) {
                byte += 1;
                bit = 0;
            }
        }
        else if (v.type === 'number') {
            let remaining = v.length;
            const spans = [];
            while (remaining > 0) {
                const len = Math.min(remaining, 8 - bit);
                spans.push({
                    byte: byte,
                    from: bit,
                    to: bit + len - 1
                });
                remaining -= len;
                bit += len;
                if (bit === 8) {
                    byte += 1;
                    bit = 0;
                }
            }
            layout[v.name] = {
                type: 'number',
                spans: spans,
            };
        }
    }
    if (byte * 8 + bit > 32) {
        throw new Error(`declared state variables take up too much space, ${byte * 8 + bit} bits used but only 32 bits allowed`);
    }
    return layout;
}
function makeNeighbourSetting(config, scope) {
    for (const key in config) {
        if (config[key].matrix.length % 2 != 1) {
            throw new Error('neighbour count matrix must be MxN with odd M and N');
        }
        const len = config[key].matrix[0].length;
        for (let line of config[key].matrix) {
            if (line.length != len) {
                throw new Error('neighbour count matrix must be MxN with odd M and N');
            }
        }
    }
    const count = Object.keys(config).length;
    const height = Math.max(...Object.values(config).map(c => c.matrix.length));
    const width = Math.max(...Object.values(config).map(c => c.matrix[0].length));
    const data = new Float32Array(width * height * count);
    const elements = [];
    let index = 0;
    for (const key in config) {
        const matrix = config[key].matrix;
        const h = matrix.length;
        const w = matrix[0].length;
        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                data[width * height * index + width * i + j] = matrix[i][j];
            }
        }
        const valuefn = parseExpression(config[key].valuefn);
        typecheck(valuefn, scope);
        elements.push({
            name: key,
            valuefn: valuefn,
            type: config[key].type,
            index: index,
            width: w,
            height: h,
            overflow: config[key].overflow,
        });
        index += 1;
    }
    return {
        data: data,
        width: width,
        height: height,
        elements: elements,
    };
}
function trimCode(code, indent_level = 0) {
    const lines = code
        .split('\n')
        .filter(l => l.trim().length > 0);
    const indent = lines[0].search(/\S/);
    return lines
        .map(l => '    '.repeat(indent_level) + l.substring(indent))
        .join('\n') + '\n';
}
function generateStateGetterFlag(name, layout) {
    return trimCode(`
        bool get_cell_state_${name}(in ivec4 cell) {
            return cell[${layout.byte}] >> ${(8 - layout.bit)} & 0b1; // TODO: check if endianness is correct
        }
    `);
}
function generateStateSetterFlag(name, layout) {
    return trimCode(`
        void set_cell_state_${name}(inout ivec4 cell, in bool val) {
            cell[${layout.byte}] |= (val ? 1 : 0) << ${8 - layout.bit};
        }
    `);
}
function generateStateGetterNumber(name, layout) {
    if (layout.spans.length === 1) {
        const span = layout.spans[0];
        const length = span.to - span.from + 1;
        return trimCode(`
            int get_cell_state_${name}(in ivec4 cell) {
                return cell[${span.byte}] >> ${(8 - span.to)} & 0x${(2 ** length - 1).toString(16)};
            }
        `);
    }
    else {
        let code = '';
        code += trimCode(`
            int get_cell_state_${name}(in ivec4 cell) {
                int val = 0;
        `);
        let remaining = layout.spans.map(s => s.to - s.from + 1).reduce((acc, v) => acc + v, 0);
        for (let span of layout.spans) {
            const length = span.to - span.from + 1;
            remaining -= length;
            code += trimCode(`
                val |= (cell_ints[${span.byte}] >> ${(8 - span.to)} & 0x${(2 ** length - 1).toString(16)}) << ${remaining};
            `, 1);
        }
        code += trimCode(`
            return val;
        `, 1);
        code += trimCode(`
            }
        `);
        return code;
    }
}
function generateStateSetterNumber(name, layout) {
    if (layout.spans.length === 1) {
        const span = layout.spans[0];
        const length = span.to - span.from + 1;
        return trimCode(`
            int set_cell_state_${name}(inout ivec4 cell, in int val) {
                cell[${span.byte}] |= (val & 0x${(2 ** length - 1).toString(16)}) << ${(8 - span.to)};
            }
        `);
    }
    else {
        let code = '';
        code += trimCode(`
            int set_cell_state_${name}(inout ivec4 cell, in int val) {
        `);
        let remaining = layout.spans.map(s => s.to - s.from + 1).reduce((acc, v) => acc + v, 0);
        for (let span of layout.spans) {
            const length = span.to - span.from + 1;
            remaining -= length;
            code += trimCode(`
                cell[${span.byte}] |= ((val >> ${remaining}) & 0x${(2 ** length - 1).toString(16)} << ${8 - span.to};
            `, 1);
        }
        code += trimCode(`
            }
        `);
        return code;
    }
}
function generateExpression(expr) {
    switch (expr.type) {
        case "Ternary": {
            const test = generateExpression(expr.test);
            const consequent = generateExpression(expr.consequent);
            const alternate = generateExpression(expr.alternate);
            return `(${test}) ? (${consequent}) : (${alternate})`;
        }
        case "Binary": {
            const left = generateExpression(expr.left);
            const right = generateExpression(expr.right);
            return `(${left}) ${expr.op} (${right})`;
        }
        case "Unary": {
            const e = generateExpression(expr.expr);
            return `${expr.op}(${e})`;
        }
        case "Cast": {
            const e = generateExpression(expr.expr);
            return `${expr.op}(${e})`;
        }
        case "IntLiteral": {
            return `${expr.value}`;
        }
        case "FloatLiteral": {
            let str = `${expr.value}`;
            if (!str.includes('.')) {
                str += '.';
            }
            return `${str}`;
        }
        case "BooleanLiteral": {
            return expr.value ? 'true' : 'false';
        }
        case "Access": {
            if (expr.path.length === 1) {
                if (expr.scope.variables[expr.path[0]].declaration === null) {
                    return `neighbour_count_${expr.path[0]}`;
                }
                else {
                    return `user_var_${expr.path[0]}`;
                }
            }
            if (expr.path[0] !== 'cell' || expr.path.length > 2) {
                throw new Error('not implemented');
            }
            return `get_cell_state_${expr.path[1]}(cell)`;
        }
    }
}
function generateNeighbourCountFunc(setting) {
    let code = '';
    const offsetX = Math.floor(setting.width / 2);
    const offsetY = Math.floor(setting.height / 2);
    const valueExprStr = generateExpression(setting.valuefn);
    code += trimCode(`
            ${setting.type} count_neighbours_${setting.name}() {
                float count = 0.0;
                for (int ix = 0; ix < ${setting.width}; ix++) {
                    for (int iy = 0; iy < ${setting.height}; iy++) {
                        int cx = coord.x + ix - ${offsetX};
                        int cy = coord.y + iy - ${offsetY};
        `);
    if (setting.overflow === 'wrap') {
        code += trimCode(`
            cx = (cx + board_size.x) % board_size.x;
            cy = (cy + board_size.y) % board_size.y;
        `, 3);
    }
    else if (setting.overflow === 'border') {
        code += trimCode(`
            if (cx < 0) {
                cx = 0;
            } else if (cx >= board_size.x) {
                cx = board_size.x - 1;
            }
            if (cy < 0) {
                cy = 0;
            } else if (cy >= board_size.y) {
                cy = board_size.y - 1;
            }
        `, 3);
    }
    else {
        code += trimCode(`
            if (cx < 0 || cx >= board_size.x || cy < 0 || cy >= board_size.y) {
                continue;
            }
        `, 3);
    }
    code += trimCode(`
        float mult = texelFetch(neighbour_count_texture, ivec3(ix, iy, ${setting.index}), 0).x;
        ivec4 cell = get_cell_at(cx, cy);
        float value = float(${valueExprStr});
        count += mult * value;
    `, 3);
    code += trimCode(`}`, 2);
    code += trimCode(`}`, 1);
    if (setting.type === 'int') {
        code += trimCode(`
            return int(count);
        `, 1);
    }
    else {
        code += trimCode(`
            return count;
        `, 1);
    }
    code += trimCode(`}`);
    return code;
}
function generateStatement(stmt, indentLevel) {
    const indent = '    '.repeat(indentLevel);
    switch (stmt.type) {
        case "Block": {
            let code = indent + '{\n';
            for (let s of stmt.body) {
                code += generateStatement(s, indentLevel + 1) + '\n';
            }
            code += indent + '}';
            return code;
        }
        case "Declaration": {
            let code = `${indent}${stmt.typename} user_var_${stmt.name}`;
            if (stmt.init !== null) {
                const e = generateExpression(stmt.init);
                code += `= ${e}`;
            }
            code += ';';
            return code;
        }
        case "Assignment": {
            const a = stmt.target;
            const expr = generateExpression(stmt.value);
            if (a.path.length === 1) {
                const scope = a.scope;
                const scopeEntry = scope.variables[a.path[0]];
                if (scopeEntry.declaration === null) {
                    throw new Error(`${a.path[0]} is read-only`);
                }
                return `${indent}user_var_${a.path[0]} = ${expr};`;
            }
            else if (a.path.length === 2) {
                if (a.path[0] !== 'cell') {
                    throw new Error('not implemented');
                }
                return `${indent}set_cell_state_${a.path[1]}(cell, ${expr});`;
            }
            else {
                throw new Error('not implemented');
            }
        }
        case "Conditional": {
            const test = generateExpression(stmt.test);
            const consequent = generateStatement(stmt.consequent, stmt.consequent.type === 'Block' ? indentLevel : indentLevel + 1);
            let code = `${indent}if (${test})\n${consequent}\n`;
            if (stmt.alternate !== null) {
                const alternate = generateStatement(stmt.alternate, stmt.alternate.type === 'Block' ? indentLevel : indentLevel + 1);
                code += `${indent}else\n${alternate}\n`;
            }
            return code;
        }
    }
}
function generateProgram(program, indentLevel) {
    let code = '';
    for (let stmt of program.body) {
        code += generateStatement(stmt, indentLevel) + '\n';
    }
    return code;
}
function generateShader(config) {
    const scope = {
        variables: {}
    };
    const stateLayout = makeStateLayout(config.state);
    scope.variables.cell = {
        type: {
            type: 'Struct',
            properties: Object.fromEntries(Object.entries(stateLayout)
                .map(([name, layout]) => ([name, {
                    type: layout.type === 'number' ? 'Int' : 'Boolean',
                }]))),
        },
        declaration: null,
    };
    const neighbourSetting = makeNeighbourSetting(config.neighbourCounts, scope);
    for (let element of neighbourSetting.elements) {
        scope.variables[element.name] = {
            type: {
                type: element.type === 'int' ? 'Int' : 'Float',
            },
            declaration: null,
        };
    }
    const generationProgram = parseProgram(config.program);
    typecheck(generationProgram, scope);
    let code = trimCode(`
        #version 300 es
        precision mediump float;
        uniform usampler2D board;
        uniform sampler2DArray neighbour_count_texture;
        in ivec2 coord;
        in ivec2 board_size;
        out vec4 output;
    `);
    code += trimCode(`
        ivec4 get_cell_at(int x, int y) {
            return texelFetch(board, ivec2(x, y), 0);
        }
    `);
    for (let key in stateLayout) {
        const o = stateLayout[key];
        if (o.type === 'flag') {
            code += generateStateGetterFlag(key, o);
            code += generateStateSetterFlag(key, o);
        }
        else {
            code += generateStateGetterNumber(key, o);
            code += generateStateSetterNumber(key, o);
        }
    }
    for (let setting of neighbourSetting.elements) {
        code += generateNeighbourCountFunc(setting);
    }
    code += trimCode(`
        void main() {
    `);
    for (let neighbourCount of neighbourSetting.elements) {
        code += trimCode(`
            ${neighbourCount.type} neighbour_count_${neighbourCount.name} = count_neighbours_${neighbourCount.name}();
        `, 1);
    }
    code += trimCode(`
        ivec4 cell = get_cell_at(coord.x, coord.y);
    `, 1);
    for (let key in stateLayout) {
        const o = stateLayout[key];
        const type = o.type === 'flag' ? 'bool' : 'int';
        code += trimCode(`
            ${type} cell_state_${key} = get_cell_state_${key}(cell);
        `, 1);
    }
    code += generateProgram(generationProgram, 1);
    for (let key in stateLayout) {
        code += trimCode(`
            set_cell_state_${key}(cell, cell_state_${key});
        `, 1);
    }
    code += trimCode(`
        output = vec4(float(cell[0]) / 255.0, float(cell[1]) / 255.0, float(cell[2]) / 255.0, float(cell[3]) / 255.0);
    `, 1);
    code += `}`;
    return code;
}
// example
const config = {
    state: [
        {
            name: 'foo',
            type: 'number',
            length: 2,
        },
        {
            name: 'age',
            type: 'number',
            length: 20,
        },
        {
            name: 'alive',
            type: 'flag',
        }
    ],
    neighbourCounts: {
        direct: {
            matrix: [
                [1, 1, 1],
                [1, 0, 1],
                [1, 1, 1]
            ],
            valuefn: 'cell.alive ? 1 : 0',
            type: 'int',
            overflow: 'wrap',
        },
        second: {
            matrix: [
                [1.0, 0.7, 0.5, 0.7, 1.0],
                [1.0, 0.5, 0.3, 0.5, 0.7],
                [0.5, 0.3, 0.0, 0.3, 0.5],
                [1.0, 0.5, 0.3, 0.5, 0.7],
                [1.0, 0.7, 0.5, 0.7, 1.0]
            ],
            valuefn: 'cell.age',
            type: 'float',
            overflow: 'zero',
        },
    },
    program: `
        bool x = cell.alive && cell.age > 10 && cell.age < 30;
        if (cell.alive) {
            if (cell.age > 25 || direct < 1 || direct > 5) {
                cell.alive = false;
                cell.age = 0;
            } else 
                cell.age += 1;
            
        } else {
            if (direct == 3) {
                cell.alive = true;
                cell.age = 1;
            }
        }
    `
};
console.log(generateShader(config));
//# sourceMappingURL=complex-shader.js.map