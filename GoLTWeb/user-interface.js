// Game Controls
let playing = false;

document.querySelector('#prev').onclick = () => viewer.prev();
document.querySelector('#next').onclick = () => viewer.next();
document.querySelector('#play').onclick = () => {
  playing = true;
  viewer.play(Math.round(iterationTime.value));
}
document.querySelector('#pause').onclick = () => {
  playing = false;
  viewer.pause();
}

window.onkeydown = function(event) {
  if (event.keyCode == 32) {
    event.preventDefault();
    if(document.getElementById("createGameSettings").style.display===""){
      document.querySelector('#createGame').click();
    } else {
      if(playing===false){
        document.querySelector('#play').click();
      } else {
        document.querySelector('#pause').click(); 
      }
    }
  } else if (event.keyCode == 37) {
    document.querySelector('#prev').click()
  } else if (event.keyCode == 39) {
    document.querySelector('#next').click()
  }else if (event.keyCode == 72) {
    if(document.getElementById("info").style.display==="block"){
      document.getElementById("info").style.display="none"
    } else {
      document.getElementById("info").style.display="block"
    }
  };
};

// UI Element fps
const it = document.getElementById('iterationTime');
renderFps();

it.addEventListener('change', function (e) {
  renderFps();
});

function renderFps(){
  iterationTime = document.getElementById('iterationTime').value;
  document.getElementById('fps').innerHTML = Math.round(1/iterationTime*1000) + '&nbsp;fps';
}


// UI Element Seed Map
const gamefieldDropdown = document.getElementById('startCondition');
renderGamefield();

gamefieldDropdown.addEventListener('change', function (e) {
  renderGamefield();
});

function renderGamefield(){
  document.getElementById('gamefieldIcon').src = 'assets/' + gamefieldDropdown.value + '.png';
}

// UI Element Gradient
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(rgb) {
  return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
}

const colormapDropdown = document.getElementById('colormap');
renderGradient();

colormapDropdown.addEventListener('change', function (e) {
  renderGradient();
});

function renderGradient(){
  let gradientString = ""
  for(let i = 0; i < 32; i++) {
    gradientString += rgbToHex(evaluate_cmap(i/32, colormapDropdown.value, document.querySelector('#reverseColormap').checked)) + (i < 31 ? ', ' : '');
  }
  document.documentElement.style.setProperty('--gradient', gradientString);
}
