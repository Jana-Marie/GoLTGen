const viewer_vertex_shader = `
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

const viewer_fragment_shader = `
#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform sampler2D u_colormap;
uniform float u_colormap_scale;

in vec2 v_texCoord;

out vec4 outputColor;

void main() {
	vec4 value = texelFetch(u_image, ivec2(v_texCoord), 0);
	int age = int(value.g*255.0 * u_colormap_scale);
	outputColor = texelFetch(u_colormap, ivec2(age, 0), 0);
}
`;

class Viewer {
	constructor(canvas, ca, colormap, reverse, minage=0, maxage=255) {
		this.canvas = canvas;
		canvas.width = ca.width;
		canvas.height = ca.height;
		this.ca = ca;


		const gl = canvas.getContext('webgl2', {antialias: false});
		this.gl = gl;
		const program = createProgram(gl, viewer_vertex_shader, viewer_fragment_shader);
	   gl.useProgram(program);
		const locations = {
	        position: gl.getAttribLocation(program, "a_position"),
	        texCoord: gl.getAttribLocation(program, "a_texCoord"),
	        resolution: gl.getUniformLocation(program, "u_resolution"),
	        imageTex: gl.getUniformLocation(program, "u_image"),
	        colormapTex: gl.getUniformLocation(program, "u_colormap"),
	        colormapScale: gl.getUniformLocation(program, "u_colormap_scale"),
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


	   gl.uniform1i(locations.imageTex, 0);
	   gl.uniform1i(locations.colormapTex, 1);

		const imageTexture = gl.createTexture();
	   this.texture = imageTexture;
		gl.activeTexture(gl.TEXTURE0);
	   gl.bindTexture(gl.TEXTURE_2D, imageTexture);
	   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.ca.width, this.ca.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.ca.getCurrentBoard());

	   const colormap_converted = this.convertColormap(colormap, reverse, minage, maxage);
	   const colormapTexture = gl.createTexture();
		gl.activeTexture(gl.TEXTURE1);
	   gl.bindTexture(gl.TEXTURE_2D, colormapTexture);
	   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, colormap_converted.length / 4, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, colormap_converted);

	   gl.viewport(0, 0, canvas.width, canvas.height);
	   gl.clearColor(0, 0, 0, 0);
	   gl.clear(gl.COLOR_BUFFER_BIT);

	   gl.enableVertexAttribArray(locations.position);
	   gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	   gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

	   gl.enableVertexAttribArray(locations.texCoord);
	   gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	   gl.vertexAttribPointer(locations.texCoord, 2, gl.FLOAT, false, 0, 0);

	   gl.uniform2f(locations.resolution, this.ca.width, this.ca.height);
	   gl.uniform1f(locations.colormapScale, this.ca.max_age > 0 ? 255 / this.ca.max_age : 1);
	   this.interval = null;
	   this.last_render = performance.now();
	   this.begin = null;
	}

	render() {
		const gl = this.gl;
		gl.activeTexture(gl.TEXTURE0);
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

	convertColormap(colormap, reverse, minage, maxage) {
		if (colormap instanceof Uint8Array) {
			return colormap;
		}
		if (Array.isArray(colormap)) {
			const arr = new Uint8Array(colormap.length * 4);
			for (let i = 0; i < colormap.length; i++) {
				arr[i*4] = colormap[i][0] * 255;
				arr[i*4+1] = colormap[i][1] * 255;
				arr[i*4+2] = colormap[i][2] * 255;
				if (colormap[i].length > 3) {
					arr[i*4+3] = colormap[i][3] * 255;
				} else {
					arr[i*4+3] = 255;
				}
			}
			return arr;
		} else if (typeof colormap === "function") {
			const arr = new Uint8Array(256 * 4);
			for(let i = 0; i < 256; i++) {
				const color = colormap(i);
				arr[i*4] = color[0];
				arr[i*4+1] = color[1];
				arr[i*4+2] = color[2];
				arr[i*4+3] = color[3];
			}
			return arr;
		} else if (typeof colormap === "string") {
			const arr = new Uint8Array(256 * 4);
			for(let i = 0; i < 256; i++) {
				//console.log((1.0/255.0*i.clamp(minage,maxage))) working, but inverse
				const color = evaluate_cmap(((i > minage ? (i < maxage ? (i-minage) : 255) : 0)/255).clamp(0,1), colormap, reverse);
				arr[i*4] = color[0];
				arr[i*4+1] = color[1];
				arr[i*4+2] = color[2];
				arr[i*4+3] = 255;
			}
			return arr;
		}
	}
}