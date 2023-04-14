const ca_vertex_shader = `
#version 300 es
in vec2 a_position;
in vec2 a_texCoord;

uniform vec2 u_resolution;

out vec2 v_texCoord;

void main() {
   // convert the rectangle from pixels to 0.0 to 1.0
   vec2 zeroToOne = a_position / u_resolution;

   // convert from 0->1 to 0->2
   vec2 zeroToTwo = zeroToOne * 2.0;

   // convert from 0->2 to -1->+1 (clipspace)
   vec2 clipSpace = (zeroToTwo - 1.0);

   clipSpace.y = clipSpace.y * -1.0;

   gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

   // pass the texCoord to the fragment shader
   // The GPU will interpolate this value between points.
   v_texCoord = a_texCoord * u_resolution;
}
`;

const ca_fragment_shader = (survive, birth, naturalDeath) => {
	let surviveCond = survive.map(num => `neighbours == ${num}`).join(' || ');
	if (naturalDeath > 0) {
		surviveCond = `(${surviveCond}) && age < ${naturalDeath}`
	}

	const birthCond = birth.map(num => `neighbours == ${num}`).join(' || ');
	return `
#version 300 es
precision mediump float;

uniform sampler2D u_image;

in vec2 v_texCoord;

out vec4 outputColor;

void main() {
	// survive: 1,2,3,4,5
	// birth: 3
	ivec2 size = textureSize(u_image, 0);
	int neighbours = 0;
	for(int x = -1; x < 2; x++) {
		int xCoord = int(v_texCoord.x) + x;
		if (xCoord < 0) {
			xCoord = size.x - 1;
		} else if (xCoord > size.x - 1) {
			xCoord = 0;
		}
		for (int y = -1; y < 2; y++) {
			if (x == 0 && y == 0) continue;
			int yCoord = int(v_texCoord.y) + y;
			if (yCoord < 0) {
				yCoord = size.y - 1;
			} else if (yCoord > size.y - 1) {
				yCoord = 0;
			}
			vec4 value = texelFetch(u_image, ivec2(xCoord, yCoord), 0);
			if (value.r > 0.0) {
				neighbours += 1;
			}
		}
	}

	vec4 value = texelFetch(u_image, ivec2(v_texCoord), 0);
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

	outputColor = vec4(alive, float(age)/255.0, float(neighbours)/8.0, 1);
}
`;
}; 


class CellularAutomaton {
	constructor(width, height, survive, birth, naturalDeath, historyCount, seedFn) {
		this.historyCount = Math.max(historyCount, 1);
		this.width = width;
		this.height = height;
		this.onGenerationChanged = null;
		this.max_age = naturalDeath;

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const gl = canvas.getContext('webgl2', {antialias: false});
		this.gl = gl;
		// TODO: dynamically create the shaders based on the survive and birth rule
		const fragmentShader = ca_fragment_shader(survive, birth, naturalDeath);
		const program = createProgram(gl, ca_vertex_shader, fragmentShader);

		const locations = {
	        position: gl.getAttribLocation(program, "a_position"),
	        texCoord: gl.getAttribLocation(program, "a_texCoord"),
	        resolution: gl.getUniformLocation(program, "u_resolution"),
	    };

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
	        0, 0,
	        width, 0,
	        0, height,
	        0, height,
	        width, 0,
	        width, height,
	    ]), gl.STATIC_DRAW);

	    const texcoordBuffer = gl.createBuffer();
	    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
	        0.0,  0.0,
	        1.0,  0.0,
	        0.0,  1.0,
	        0.0,  1.0,
	        1.0,  0.0,
	        1.0,  1.0,
	    ]), gl.STATIC_DRAW);
		const texture = gl.createTexture();
	    gl.bindTexture(gl.TEXTURE_2D, texture);
	    this.texture = texture;

	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	    gl.clearColor(0, 0, 0, 0);
	    gl.clear(gl.COLOR_BUFFER_BIT);

	    gl.useProgram(program);
	    gl.enableVertexAttribArray(locations.position);
	    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

	    gl.enableVertexAttribArray(locations.texCoord);
	    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	    gl.vertexAttribPointer(locations.texCoord, 2, gl.FLOAT, false, 0, 0);

	    gl.uniform2f(locations.resolution, width, height);

	    const initial_state = new Uint8Array(this.width * this.height * 4);
	    seedFn(initial_state, width, height);
	    this.history = [initial_state];
	    this.current_board = initial_state;
		this.current_generation = 0;
		this.signalGenerationChanged();
	}

	iterate() {
		const current_board = this.history[this.history.length - 1];
		const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, current_board);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const new_board = new Uint8Array(this.width * this.height * 4);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, new_board);
        this.history.push(new_board);
        this.current_board = new_board;
        if (this.history.length > this.historyCount) {
        	this.history.shift();
        }
		this.current_generation += 1;
		this.signalGenerationChanged();
	}

	goBack() {
		if (this.history.length > 1) {
			this.history.pop();
			this.current_board = this.history[this.history.length - 1];
			this.current_generation -= 1;
			this.signalGenerationChanged();
		}
	}

	getCell(x, y) {
		const offset = (x*this.width + y)*4;
	    return {
	        active: this.current_board[offset] > 0,
	        age: this.current_board[offset + 1],
	        neighbours: Math.round(this.current_board[offset + 2]*8/255),
	    }
	}

	getCurrentBoard() {
		return this.current_board;
	}

	signalGenerationChanged() {
		if (this.onGenerationChanged !== null) {
			this.onGenerationChanged(this.current_generation);
		}
	}
}