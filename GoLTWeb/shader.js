window.vertexShader = `
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

window.fragmentShader = `
#version 300 es
precision mediump float;

uniform sampler2D u_image;

uniform mat3 u_kernel;

in vec2 v_texCoord;

out vec4 outputColor;

void main() {
	// survive: 1,2,3,4,5
	// birth: 3
	int neighbours = 0;
	for(int x = -1; x < 2; x ++) {
		for (int y = -1; y < 2; y++) {
			if (x != y) {
				vec4 value = texelFetch(u_image, ivec2(v_texCoord.x + float(x), v_texCoord.y + float(y)), 0);
				if (value.r > 0.0) {
					neighbours += 1;
				}
			}
		}
	}

	vec4 value = texelFetch(u_image, ivec2(v_texCoord), 0);
	bool alive = value.r > 0.0;
	int age = int(value.g * 255.0);
	if (alive) {
		if (neighbours < 1 || neighbours > 5) {
			alive = false;
			age = 0;
		} else {
			age += 1;
		}
	} else {
		age = 0;
		if (neighbours == 3) {
			alive = true;
		}
	}

	outputColor = vec4(alive, float(age)/255.0, float(neighbours)/8.0, 1);
}
`;