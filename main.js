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
let divsize_x = 1 / 440; // s. / div

// draw settigns
const gridWidth = 0.5;
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
const trigger_type = "force";
setInterval(trigger, 10);
let triggerIndex = 0;
let triggerDelta = 0;

function trigger(){
	if (!initialized) return;

	const indexSize = divsize_x * x_divs * audioContext.sampleRate;
	if (audioData.length - triggerIndex < indexSize) return;

	let nextTriggerIndex;

	if(trigger_type == "up"){
	}else{
		nextTriggerIndex = audioData.length;
	}

	triggerDelta = nextTriggerIndex - triggerIndex;
	triggerIndex = nextTriggerIndex;
}

setInterval(draw, 30);
function draw(){
	ctx.clearRect(0, 0, width, height);
	drawText();
	drawGrid();
	drawWave();
}

function drawText(){
	let divsize_x_disp;
	if(divsize_x >= 1){
		divsize_x_disp = `${divsize_x.toFixed(2)} s/div`
	}else if(divsize_x >= 1e-3){
		divsize_x_disp = `${(divsize_x * 1e3).toFixed(2)} ms/div`
	}else{
		divsize_x_disp = `${(divsize_x * 1e6).toFixed(2)} us/div`
	}
	document.getElementById('bottomDisplay').innerText = `${divsize_x_disp}`;
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
}

function drawWave(){
	if (!initialized) return;

	const length = divsize_x * x_divs * audioContext.sampleRate;
	const startIndex = triggerIndex;

	const indexSize = divsize_x * x_divs * audioContext.sampleRate;

	// let time = length / audioContext.sampleRate;

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
		const y = (val / 2 + 0.5) * canvas.height;
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
		let scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
		localScriptProcessor = scriptProcessor;
		let mediastreamsource = audioContext.createMediaStreamSource(stream);
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