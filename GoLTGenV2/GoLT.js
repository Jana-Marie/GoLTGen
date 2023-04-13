// GoLTGenV2 – Jana Marie Hemsing – 2023

//import { colorMixer } from './color.js'

var ruleSet = {
	'name': "gol",
	'survive': [2,3,4],
	'birth': [3],
	'starve': -1,
	'naturalDeath': -1,
};

var config = {
	'display': 3,
	'currentDisply': 0,
	'gameX': 100,
	'gameY': 100,
	'scaleFactor': 3,
	'history': 3,
	'refreshTime': 30,
	'index': 0,
}

var game = []; 	// game storage, 0 = gol, 1 = neighbors, 2 = lifetime
for (let i = 0; i < config.display; i++){
	game[i] = new Array();		// game history
		for (let j = 0; j < config.history; j++){
			game[i][j] = new Array(config.history);			// playfield x
			for (let k = 0; k < config.gameX; k++){
				game[i][j][k] = new Array(config.gameX);			// playfield x
				for (let l = 0; l < config.gameY; l++){
					game[i][j][k][l] = new Array(config.gameY);			// playfield y
			}
		}
	}
}

function init_GoLT() {
	populate_GoLT_rand();
    setInterval(run_GoLT, config.refreshTime);
}

function run_GoLT() {
	const canvas = document.getElementById("GoLT");
	const pCtx = canvas.getContext("2d");
	
	const offscreen = new OffscreenCanvas(config.gameX*config.scaleFactor, config.gameY*config.scaleFactor);
	const ctx = offscreen.getContext("2d");


	idx = config.index;
	idxNext = (config.index + 1) % (config.history - 1);
	idxLast = config.index == 0 ? config.history-1 : (config.index-1);
	config.index = (config.index + 1) % (config.history - 1);
	//console.log(idxLast,idx,idxNext,config.index)

	for (let x = 0; x < config.gameX; x++){
		for (let y = 0; y < config.gameY; y++){
			// wrap around
			xp = (x+1 < config.gameX-1) ? x+1 : 0;
			xm = (x-1 > 0) ? x-1 : config.gameX-1;
			
			yp = (y+1 < config.gameY-1) ? y+1 : 0;
			ym = (y-1 > 0) ? y-1 : config.gameY-1;

			// count and return neighbors
			game[2][idx][x][y] = 0;
			game[2][idx][x][y] += game[0][idx][xm][ym];
			game[2][idx][x][y] += game[0][idx][xm][y ];
			game[2][idx][x][y] += game[0][idx][xm][yp];
			game[2][idx][x][y] += game[0][idx][x ][yp];
			game[2][idx][x][y] += game[0][idx][x ][ym];
			game[2][idx][x][y] += game[0][idx][xp][ym];
			game[2][idx][x][y] += game[0][idx][xp][y ];
			game[2][idx][x][y] += game[0][idx][xp][yp];

			game[0][idxNext][x][y] = 0;

			// birth rule
			if (ruleSet.birth.includes(game[2][idx][x][y])) {
				if (game[0][idx][x][y] == 0) {
					game[0][idxNext][x][y] = 1;
				}
			}
			
			// survive rule
			if (ruleSet.survive.includes(game[2][idx][x][y])) {
				if (game[0][idx][x][y] == 1) {
					game[0][idxNext][x][y] = 1;
				}
			}

			// natural death rule
			//if (game[0][idx][x][y] == 1 && ruleSet.naturalDeath >= 0) {
			//	if (game[1][idx][x][y] >= ruleSet.naturalDeath) {
			//		game[0][idxNext][x][y] = 0;
			//	}
			//}

			// starve rule
			//if (game[0][idx][x][y] == 1 && game[0][idxNext][x][y] == 0 && ruleSet.starve >= 0) {
			//	if (game[1][idx][x][y] <= ruleSet.starve) {
			//		game[0][idxNext][x][y] = 1;
			//	}
			//}

			// lifetime counter
			if (game[0][idx][x][y] == 1 && game[0][idxNext][x][y] == 1) {
				game[1][idxNext][x][y] = game[1][idx][x][y] + 1;
				game[1][idxNext][x][y] = game[1][idxNext][x][y] >= 255 ? 255 : game[1][idxNext][x][y];
			} else {
				game[1][idxNext][x][y] = 0;
			}

			ctx.fillStyle = colorMixer([253, 231, 37],[68, 1, 84], game[1][idx][x][y]/250);
			ctx.fillRect(x*config.scaleFactor, y*config.scaleFactor, config.scaleFactor, config.scaleFactor);
		}
	}

	canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
	
	var pat = pCtx.createPattern(offscreen, 'repeat');
	pCtx.rect(0, 0, canvas.width, canvas.height);
	pCtx.fillStyle = pat;
	pCtx.fill();
}

function populate_GoLT_rand() {
	for (let x = 0; x < config.gameX; x++){
		for (let y = 0; y < config.gameY; y++){
			game[0][0][x][y] = (x < config.gameX/3*2 && x > config.gameX/3 && y < config.gameY/3*2 && y > config.gameY/3) ? Math.floor(Math.random()*2) : 0;
			//game[0][0][x][y] = 0;
			game[1][0][x][y] = 0;
			game[2][0][x][y] = 0;
		}
	}
	//game[0][0][10][10] = 1;
	//game[0][0][10][11] = 1;
	//game[0][0][10][12] = 1;
}

function rgbcm(a, b, n){
    var channelA = a*n;
    var channelB = b*(1-n);
    return parseInt(channelA+channelB);
}

var colorMixer = function cm(a, b, n){
    var r = rgbcm(a[0], b[0], n);
    var g = rgbcm(a[1], b[1], n);
    var b = rgbcm(a[2], b[2], n);
    return "rgb("+r+","+g+","+b+")";
}
