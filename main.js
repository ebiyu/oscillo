// 参考: https://qiita.com/mhagita/items/6c7d73932d9a207eb94d

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

const canvas = document.getElementById('wave_canvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

// fundamental settings
const x_divs = 10;
const y_divs = 10;

// variables
let divsize_x = 0.01; // s. / div

// draw settigns
const gridWidth = 1;
const gridWidth_bold = 2;
const waveWidth = 2;

const waveColor = "#ff0"

// buffer size
const bufferSize = 1024;

// objects for api
let localMediaStream = null;
let localScriptProcessor = null;
let audioContext = null;
let audioAnalyser = null;
let audioData = []; // wave data

// flags
let recording = false;
let initialized = false;

// trigger
let triggerLevel = 0;
let trigger_type = "up";

setInterval(trigger_check, 10);
let triggerIndex = 0;
let triggerDelta = 0;
let triggerLastChecked = 0;

function trigger_check(){
	if (!initialized) return;

	// abort if triggering has not ended
	const indexSize = divsize_x * x_divs * audioContext.sampleRate;
	if (audioData.length - triggerIndex < indexSize) {
		triggerLastChecked = audioData.length;
		return;
	}

	if(trigger_type == "up"){
		// check positive edge
		let below = false;
		audioData.slice(triggerLastChecked).some((v, i) => {
			if(v > triggerLevel){
				if(below){
					trigger(triggerLastChecked + i);
					return true;
				}
			}else{
				below = true;
			}
		})
	}else{
		trigger(audioData.length);
	}

	triggerLastChecked = audioData.length;
}

function trigger(index){
	const prevTriggerIndex = triggerIndex;
	triggerIndex = index;
	triggerDelta = triggerIndex - prevTriggerIndex;
	console.count();
	// console.log(triggerLastChecked);
	console.log({prevTriggerIndex, triggerIndex, triggerDelta, triggerLastChecked})
}

setInterval(draw, 30);
function draw(){
	ctx.clearRect(0, 0, width, height);
	drawText();
	drawGrid();
	drawWave();
}

function drawText(){
	const divsize_x_disp = divsize_x >= 1 ? `${divsize_x.toFixed(2)} s/div` :
		divsize_x >= 1e-3 ? `${(divsize_x * 1e3).toFixed(2)} ms/div` :
		`${(divsize_x * 1e6).toFixed(2)} us/div`;
	const trigger_disp = trigger_type == "up" ? `Trigger Level ${triggerLevel.toFixed(2)}↑` : "No Trigger";
	document.getElementById('bottomDisplay').innerHTML = `${divsize_x_disp} <span style="color: orange">${trigger_disp}</span>`;
}

function drawGrid(){
	ctx.strokeStyle ="#fff";

	// horizontal
	[...Array(y_divs + 1)].map((_, i) => i).forEach(i => {
		if(i * 2 == y_divs){
			ctx.lineWidth = gridWidth_bold;
		}else{
			ctx.lineWidth = gridWidth;
		}
		const y = i * height / y_divs;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);
		ctx.stroke();
	});

	// vertical
	[...Array(x_divs + 1)].map((_, i) => i).forEach(i => {
		if(i * 2 == x_divs){
			ctx.lineWidth = gridWidth_bold;
		}else{
			ctx.lineWidth = gridWidth;
		}
		const x = i * width / x_divs;
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, height);
		ctx.stroke();
	});

	// trigger
	if(trigger_type == "up"){
		ctx.strokeStyle = "orange";
		ctx.lineWidth = gridWidth_bold;
		const y =  (0.5 - triggerLevel / 2) * height;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);
		ctx.stroke();
	}
}

function drawWave(){
	if (!initialized) return;

	const length = divsize_x * x_divs * audioContext.sampleRate;
	const startIndex = triggerIndex;

	ctx.strokeStyle = waveColor;
	ctx.lineWidth = waveWidth;

	ctx.beginPath();

	[...Array(width)].map((_, i) => i).forEach(x => {
		let index = startIndex + Math.floor(x * length / width);
		if(divsize_x < 0.01){
			index -= triggerDelta;
		}else if(audioData.length > length && index > audioData.length){
			index -= triggerDelta;
		}
		const val = audioData[index];
		const y = (0.5 - val / 2) * canvas.height;
		ctx.lineTo(x, y);
	});

	ctx.stroke();
}

function toggleRecording() {
	recording = !recording;
	document.getElementById("togglebutton").innerHTML = recording ? "Stop" : "Run";
	if (!initialized) initialize();
}

function initialize(){
	audioContext = new AudioContext();
	navigator.getUserMedia({audio: true}, stream => {
		localMediaStream = stream;
		const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
		localScriptProcessor = scriptProcessor;
		const mediastreamsource = audioContext.createMediaStreamSource(stream);
		mediastreamsource.connect(scriptProcessor);
		scriptProcessor.onaudioprocess = onAudioProcess;
		scriptProcessor.connect(audioContext.destination);
	}, e => {
		console.log(e);
	});

	initialized=true;
}

// recording loop
function onAudioProcess(e) {
	if (!recording) return;

	let input = e.inputBuffer.getChannelData(0);
	audioData = [...audioData, ...input];
};

// shortcut keys
document.onkeydown = e => {
	console.log(e.keyCode);
	switch(e.keyCode){
		case 32: // space
			toggleRecording();
			break;
		case 38: //up
			triggerLevel += 0.05;
			break;
		case 40: //down
			triggerLevel -= 0.05;
			break;
		case 37: //left
			divsize_x /= 10;
			break;
		case 39: //right
			divsize_x *= 10;
			break;
		case 84:
			trigger_type = trigger_type == "up" ? "" : "up";
			break;
	}
}
