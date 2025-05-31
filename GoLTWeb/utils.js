function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }
   
    console.log(gl.getProgramInfoLog(program));
    throw 'shader compilation failed';
}

function createShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source.trim());
	gl.compileShader(shader);
	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (success) {
	  return shader;
	}

	console.log(gl.getShaderInfoLog(shader));
	gl.deleteShader(shader);
}

function createSeed(width, height) {
	const arr = new Uint8Array(width * height * 4);
	for(let i = 5; i < height - 5; i++) {
		for (let j = 5; j < width - 5; j++) {
			arr[(i*width+j)*4] = 255;
		}
	}
	return arr;
}

function rectSeed(board, width, height, mod) {
  mod = Math.round(Math.max((mod/2), 0));
  a = width/height;
  if(a > 1){
    w = mod;
    h = Math.round(mod*a);
  } else {
    w = Math.round(mod*a);
    h = mod;
  }
  midX = width/2;
  midY = height/2;
  for(let i = midY-h; i < midY+h; i++) {
    for (let j = midX-w; j < midX+w; j++) {
      board[(i*width+j)*4] = 255;
    }
  }
}

function rectArraySeed(board, width, height, mod) {
  mod = Math.round(Math.max((mod/2), 0));
  a = width/height;
  if(a > 1){
    w = mod;
    h = Math.round(mod*a);
  } else {
    w = Math.round(mod*a);
    h = mod;
  }
  midX = width/2;
  qX = midX/2;
  midY = height/2;
  qY = midY/2;
  for(let k = -1; k < 2; k+=2){
    for(let l = -1; l < 2; l+=2){
      for(let i = (midY+(k*qY))-h; i < (midY+(k*qY))+h; i++) {
        for (let j = (midX+(l*qX))-w; j < (midX+(l*qX))+w; j++) {
          board[(i*width+j)*4] = 255;
        }
      }
    }
  }
}

function squareSeed(board, width, height, mod) {
  mod = Math.round(Math.max((mod/2), 0));
  midX = width/2;
  midY = height/2;
  for(let i = midY-mod; i < midY+mod; i++) {
    for (let j = midX-mod; j < midX+mod; j++) {
      board[(i*width+j)*4] = 255;
    }
  }
}

function crossSeed(board, width, height, mod) {
  mod = Math.round(Math.max((mod/2), 0));
  midX = width/2;
  midY = height/2;
  for(let i = midY-Math.round(mod/2); i < midY+Math.round(mod/2); i++) {
    for (let j = midX-(mod*2); j < midX+(mod*2); j++) {
      board[(i*width+j)*4] = 255;
    }
  }
  for(let i = midY-(mod*2); i < midY+(mod*2); i++) {
    for (let j = midX-Math.round(mod/2); j < midX+Math.round(mod/2); j++) {
      board[(i*width+j)*4] = 255;
    }
  }
}

function verticalBarSeed(board, width, height, mod) {
  mod = Math.round(Math.max((mod/2), 0));
  midX = width/2;
  midY = height/2;
  for(let i = midY-Math.round(mod); i < midY+Math.round(mod); i+=2) {
    for (let j = 0; j < width; j++) {
      board[(i*width+j)*4] = 255;
    }
  }
}

function horizontalBarSeed(board, width, height, mod) {
  mod = Math.round(Math.max((mod/2), 0));
  midX = width/2;
  midY = height/2;
  for(let i = 0; i < height; i++) {
    for (let j = midX-Math.round(mod); j < midX+Math.round(mod); j+=2) {
      board[(i*width+j)*4] = 255;
    }
  }
}

function circleSeed(board, width, height, mod) {
  mod = Math.max((mod), 0);
  midX = width/2;
  midY = height/2;
  sq = (mod) ** 2 + (mod) ** 2;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if(Math.abs(((midY - i) ** 2 + (midX - j) ** 2) < sq)) {
        board[(i*width+j)*4] = 255;
      }
    }
  }
}

function circleArraySeed(board, width, height, mod) {
  mod = Math.round(Math.max((mod), 0));
  midX = width/2;
  qX = midX/2;
  midY = height/2;
  qY = midY/2;
  sq = (mod) ** 2 + (mod) ** 2;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      for(let k = -1; k < 2; k+=2){
        for(let l = -1; l < 2; l+=2){
          if(Math.abs((((midY+(k*qY)) - i) ** 2 + ((midX+(l*qX)) - j) ** 2) < sq)) {
            board[(i*width+j)*4] = 255;
          }
        }
      }
    }
  }
}

function ovalSeed(board, width, height, mod) {
  mod = Math.max((mod), 0);
  a = width/height;
  if(a > 1){
    h = mod;
    w = Math.round(mod*a);
  } else {
    h = Math.round(mod*a);
    w = mod;
  }
  midX = width/2;
  midY = height/2;
  sqX = w ** 2;
  sqY = h ** 2;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if(Math.abs((midY - i) ** 2) < sqY && Math.abs((midX - j) ** 2) < sqX) {
        board[(i*width+j)*4] = 255;
      }
    }
  }
}

function ringSeed(board, width, height, mod) {
  mod = Math.max((mod), 0);
  midX = width/2;
  midY = height/2;
  sq = (mod) ** 2 + (mod) ** 2;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if(Math.abs(((midY - i) ** 2 + (midX - j) ** 2) - sq) < 14) {
        board[(i*width+j)*4] = 255;
      }
    }
  }
}

function randomBlobSeed(board, width, height, mod) {
  mod = Math.round(Math.max((mod), 0));
  midX = width/2;
  qX = midX/2;
  midY = height/2;
  qY = midY/2;
  sq = (mod) ** 2 + (mod) ** 2;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      for(let k = -1; k < 2; k++){
        for(let l = -1; l < 2; l++){
          if(Math.abs((((midY+(k*Math.floor(Math.random() * 11)-5)) - i) ** 2 + ((midX+(l*Math.floor(Math.random() * 11)-5)) - j) ** 2) < (sq +Math.floor(Math.random() * 101)-50))) {
            board[(i*width+j)*4] = 255;
          }
        }
      }
    }
  }
}

function randomSeed(board, width, height, mod) {
  mod = Math.max(mod, 0);
  mod = Math.min(mod, 100);
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if (Math.random() < mod/100) {
        board[(i*width+j)*4] = 255;
      }
    }
  }
}

function resizeCanvasToDisplaySize(canvas) {
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const displayWidth  = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
 
  // Check if the canvas is not the same size.
  const needResize = canvas.width  !== displayWidth ||
                     canvas.height !== displayHeight;
 
  if (needResize) {
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }
 
  return needResize;
}

Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
};