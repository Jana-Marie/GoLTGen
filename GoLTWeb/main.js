function canvas_click(e) {
    console.log(e);
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const board_x = Math.floor(x / rect.width * window.board_width);
    const board_y = Math.floor(y / rect.height * window.board_height);
    const info = getPixel(board_x, board_y);
    document.getElementById('info').innerHTML = `
        x: ${board_x}, 
        y: ${board_y}, 
        active: ${info.active ? 'yes' : 'no'},
        age: ${info.age},
        neighbours: ${info.neighbours}`;
}


function main() {
    const width = 50;
    const height = 50;
    window.board_width = width;
    window.board_height = height;

    const pixels = createSeed(width, height);

    const canvas = document.querySelector("canvas");
    canvas.onclick = canvas_click;
    // resizeCanvasToDisplaySize(canvas);
    canvas.width = width;
    canvas.height = height;
    const gl = canvas.getContext('webgl2', {antialias: false});

    const program = createProgram(gl, window.vertexShader, window.fragmentShader);

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

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);



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

    gl.uniform2f(locations.resolution, gl.canvas.width, gl.canvas.height);


    // gl.drawArrays(gl.TRIANGLES, 0, 6);

    // gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    // console.log(pixels);


    const stack = [pixels];

    const next = () => {
        const current_board = stack[stack.length - 1];
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, current_board);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const new_board = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, new_board);
        stack.push(new_board);
        window.board = new_board;
    };

    const prev = () => {
        stack.pop();
        stack.pop();
        next();
    };

    window.next = next;
    window.prev = prev;

    let interval = null;

    window.play = () => {
        interval = window.setInterval(() => next(), 50);
    }
    window.pause = () => {
        window.clearInterval(interval);
    }
}

function getPixel(x, y) {
    const offset = (x*window.board_width + y)*4;
    return {
        active: window.board[offset] > 0,
        age: window.board[offset + 1],
        neighbours: Math.round(window.board[offset + 2]*8/255),
    }
}