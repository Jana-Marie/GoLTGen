// @ts-ignore
import * as infer from "tern/lib/infer.js";

export interface SimpleRuleset {
    survive: number[];
    birth: number[];
    natural_death: number|null;
}

type CellState = [number, number, number, number];

type StateFetcher = (x: number, y: number) => CellState;

type FunctionalRuleset = (x: number, y: number, get_state: StateFetcher, board_width: number, board_height: number) => CellState;

type SeedFn = (x: number, y: number, board_width: number, board_height: number) => CellState|boolean;


function shaderSourceFromSimpleRuleset(ruleset: SimpleRuleset, inputTextureName: string, inputCoordName: string): string {
    let surviveCond = ruleset.survive.map(num => `neighbours == ${num}`).join(' || ');
    if (ruleset.natural_death !== null) {
        surviveCond = `(${surviveCond}) && age < ${ruleset.natural_death}`
    }
    const birthCond = ruleset.birth.map(num => `neighbours == ${num}`).join(' || ');
    return `#version 300 es
    precision mediump float;
    uniform sampler2D ${inputTextureName};
    in vec2 ${inputCoordName};
    out vec4 output;
    void main() {
        ivec2 size = textureSize(${inputTextureName}, 0);
        int neighbours = 0;
        for(int x = -1; x < 2; x++) {
            int xCoord = int(${inputCoordName}.x) + x;
            if (xCoord < 0) {
                xCoord = size.x - 1;
            } else if (xCoord > size.x - 1) {
                xCoord = 0;
            }
            for (int y = -1; y < 2; y++) {
                if (x == 0 && y == 0) continue;
                int yCoord = int(${inputCoordName}.y) + y;
                if (yCoord < 0) {
                    yCoord = size.y - 1;
                } else if (yCoord > size.y - 1) {
                    yCoord = 0;
                }
                vec4 value = texelFetch(${inputTextureName}, ivec2(xCoord, yCoord), 0);
                if (value.r > 0.0) {
                    neighbours += 1;
                }
            }
        }
        vec4 value = texelFetch(${inputTextureName}, ivec2(${inputCoordName}), 0);
        bool alive = value.r > 0.0;
        int age = int(value.g * 255.0);
        if (alive) {
            if (!(${surviveCond})) {
                alive = false;
                age = 0;
            } else {
                age += 1;
            }
        } else {
            age = 0;
            if (${birthCond}) {
                alive = true;
            }
        }
        output = vec4(alive, float(age)/255.0, 0, 0);
    }`;
}

function shaderSourceFromFunctionalRuleset(ruleset: string): string {
    const ctx = new infer.Context({});
    infer.withContext(ctx, () => {
        const ast = infer.parse(ruleset);
        infer.analyze(ast, "ruleset");
        console.log(ast.body[0].expression.body);
    })
    return '';
}



console.log(shaderSourceFromFunctionalRuleset(`

`));


// class CellularAutomaton {
//     constructor(rules: SimpleRuleset|FunctionalRuleset, historyCount: number, seeder: SeedFn) {
//         if (typeof rules === "function") {
//             // functional ruleset
//         } else {
//             // simple ruleset
//             const functional_rules: FunctionalRuleset = (x, y, state, board_width, board_height) => {
//
//             }
//         }
//
//
//
//     }
// }