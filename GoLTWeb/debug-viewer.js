const debug_viewer_vertex_shader = `
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

const debug_viewer_fragment_shader = `
#version 300 es
precision mediump float;

uniform sampler2D u_image;

uniform bvec3 u_parts;

in vec2 v_texCoord;

out vec4 outputColor;

void main() {
	vec4 value = texelFetch(u_image, ivec2(v_texCoord), 0);

	bool show_active = u_parts[0];
	bool show_age = u_parts[1];
	bool show_neighbours = u_parts[2];

	outputColor = vec4(
		show_active ? value.r : 0.0,
		show_age ? value.g : 0.0,
		show_neighbours ? value.b : 0.0,
		1
	);
}
`;


class DebugViewer {
	constructor(canvas, ca) {
		this.canvas = canvas;
		canvas.width = ca.width;
		canvas.height = ca.height;
		this.ca = ca;
		this.renderActive = true;
		this.renderAge = true;
		this.renderNeighbours = true;

		const gl = canvas.getContext('webgl2', {antialias: false});
		this.gl = gl;
		const program = createProgram(gl, debug_viewer_vertex_shader, debug_viewer_fragment_shader);
		const locations = {
	        position: gl.getAttribLocation(program, "a_position"),
	        texCoord: gl.getAttribLocation(program, "a_texCoord"),
	        resolution: gl.getUniformLocation(program, "u_resolution"),
	        parts: gl.getUniformLocation(program, "u_parts"),
	    };
	    this.locations = locations;

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
	        0, 0,
	        this.ca.width, 0,
	        0, this.ca.height,
	        0, this.ca.height,
	        this.ca.width, 0,
	        this.ca.width, this.ca.height,
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

	    gl.viewport(0, 0, this.ca.width, this.ca.height);
	    gl.clearColor(0, 0, 0, 0);
	    gl.clear(gl.COLOR_BUFFER_BIT);

	    gl.useProgram(program);
	    gl.enableVertexAttribArray(locations.position);
	    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

	    gl.enableVertexAttribArray(locations.texCoord);
	    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	    gl.vertexAttribPointer(locations.texCoord, 2, gl.FLOAT, false, 0, 0);

	    gl.uniform2f(locations.resolution, this.ca.width, this.ca.height);
	    this.interval = null;
	    this.last_render = performance.now();
	    this.begin = null;
	}

	render() {
		const gl = this.gl;
	    gl.uniform3i(this.locations.parts, 
	    	this.renderActive ? 1 : 0,
	    	this.renderAge ? 1 : 0,
	    	this.renderNeighbours ? 1 : 0,
		);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		const board = this.ca.getCurrentBoard();
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.ca.width, this.ca.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, board);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		const now = performance.now();
		this.last_render_duration = now - this.last_render;
		this.last_render = now;
		if (this.begin === null) {
			this.begin = now;
			this.total_duration = 0;
		} else {
			this.total_duration = now - this.begin;
		}
	}

	next() {
		if (this.interval === null) {
			this.ca.iterate();
			this.render();
		}
	}

	prev() {
		if (this.interval === null) {
			this.ca.goBack();
			this.render();
		}
	}

	play(interval) {
		if (this.interval === null) {
			this.interval = window.setInterval(() => {
				this.ca.iterate();
				this.render();
			}, interval);
		}
	}

	pause() {
		if (this.interval !== null) {
			window.clearInterval(this.interval);
			this.interval = null;
		}
	}

	setRenderAge(renderAge) {
		this.renderAge = renderAge;
		this.render();
	}

	setRenderActive(renderActive) {
		this.renderActive = renderActive;
		this.render();
	}

	setRenderNeighbours(renderNeighbours) {
		this.renderNeighbours = renderNeighbours;
		this.render();
	}
}