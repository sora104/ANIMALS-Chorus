"use strict";
function audioContextCheck() {
    if (typeof AudioContext !== "undefined") {
        return new AudioContext();
    }
    else if (typeof webkitAudioContext !== "undefined") {
        return new webkitAudioContext();
    }
    else if (typeof mozAudioContext !== "undefined") {
        return new mozAudioContext();
    }
    else {
        throw new Error('AudioContext not supported')
    }
}

var audioContext = audioContextCheck();

var sound = audioBatchLoader({
    kick: "./sounds/Kick.wav",
    snare: "./sounds/Snare.wav",
    hihat: "./sounds/Hi-Hat.wav",
    shaker: "./sounds/Tom.wav"

});

window.onload = function () {
    var onOff = document.getElementById("on-off");
    /*_____________________________________BEGIN set initial osc state to false*/
    var osc = false;
    var gainNode = false; // 控制音量
    var span = document.getElementsByTagName("span")[0];
    var freqValue = document.getElementsByTagName("input")[1].value; // 定义变量来存储鼠标x轴位置坐标为频率值
    var volValue = document.getElementsByTagName("input")[2].value; // 定义变量来存储鼠标y轴位置坐标为音量
    var spanslide = document.getElementsByTagName("p")[0];
    var selectedWaveform = "sine";
    var waveformTypes = document.getElementsByTagName('li');
    var defultWaveformElement = document.getElementById(selectedWaveform);
    defultWaveformElement.classList.add("selected-waveform");
    var kick = document.getElementById("kick");
    var snare = document.getElementById("snare");
    var hihat = document.getElementById("hihat");
    var shaker = document.getElementById("shaker");
    kick.addEventListener("click", function() {
        sound.kick.play();
    });
    snare.addEventListener("click", function() {
        sound.snare.play();
    });
    hihat.addEventListener("click", function() {
        sound.hihat.play();
    });
    shaker.addEventListener("click", function() {
        sound.shaker.play();
    });

    function select() {
        var selectedWaveformElement = document.getElementById(this.id);
        selectedWaveform = document.getElementById(this.id).id;
        for (var i = 0; i < waveformTypes.length; i += 1) {
            waveformTypes[i].classList.remove("selected-waveform");
        }
        selectedWaveformElement.classList.add("selected-waveform");
        console.log(selectedWaveform);
    }
    // 获取鼠标在页面上的位置信息----Start
    function getMousePosition(ev) {
        if (ev.pageX || ev.pageY) {
            return { x: ev.pageX, y: ev.pageY };
        }
        return {
            x: ev.clientX + document.body.scrollLeft - document.body.clientLeft,
            y: ev.clientY + document.body.scrollTop - document.body.clientTop
        };
    };
    function mouseMove(ev) {
        ev = ev || window.event;
        var mousePos = getMousePosition(ev);
        document.getElementById('xPos').value = mousePos.x;
        document.getElementById('yPos').value = mousePos.y;
    }
    document.onmousemove = mouseMove;
    //获取鼠标在页面上的位置信息----End
    for (var i = 0; i < waveformTypes.length; i++) {
        waveformTypes[i].addEventListener('click', select);
    }
    setInterval(function () {
        if (!osc) {
            console.log("Oscillator is stopped. Waiting for oscillator to start");
        } else {
            freqValue = document.getElementsByTagName("input")[1].value; // 调用变量来存储鼠标x轴位置坐标为频率值
            volValue = document.getElementsByTagName("input")[2].value; // 调用变量来存储鼠标y轴位置坐标为音量
            osc.frequency.value = freqValue / 2; // 音高除二
            gainNode.gain.value = volValue / 3000;
            console.log("Oscillator is playing. Frequency value is " + osc.frequency.value);
            console.log("Oscillator is playing. Volume value is " + gainNode.gain.value);
            spanslide.innerHTML = "Frequency: " + osc.frequency.value + "Hz"; // 实时显示xy轴数据
            osc.type = selectedWaveform;
        }
    }, 50);

    /*_____________________________________END set initial osc state to false*/
    onOff.addEventListener("click", function () {
        /*_________________________________BEGIN Conditional statement to check if osc is TRUE or FALSE*/
        if (!osc) { /*_____________________Is osc false? If so then create and assign oscillator to osc and play it.*/
            osc = audioContext.createOscillator();
            gainNode = audioContext.createGain(); // 调用gainNode功能控制音量
            osc.type = "sine";
            osc.frequency.value = freqValue / 2;
            gainNode.gain.value = volValue / 2000;
            osc.connect(audioContext.destination);
            gainNode.connect(audioContext.destination); // 同81
            osc.connect(gainNode); // gainNode控制振荡器音量
            osc.start(audioContext.currentTime);
            onOff.value = "stop";
            span.innerHTML = "Click to stop";
            spanslide.innerHTML = "Frequency: " + osc.frequency.value + "Hz";
            /*_____________________________Otherwise stop it and reset osc to false for next time.*/
        } else {
            osc.stop(audioContext.currentTime);
            osc = false;
            gainNode = false;
            onOff.value = "start";
            span.innerHTML = "Click to start";
        }
        /*_________________________________END Conditional statement to check if osc is TRUE or FALSE*/
    });
};

function audioFileLoader(fileDirectory) {
    var soundObj = {};
    var playSound = undefined;
    var getSound = new XMLHttpRequest();
    soundObj.fileDirectory = fileDirectory;
    getSound.open("GET", soundObj.fileDirectory, true);
    getSound.responseType = "arraybuffer";
    getSound.onload = function() {
        audioContext.decodeAudioData(getSound.response, function(buffer) {
            soundObj.soundToPlay = buffer;

        });
    };

    getSound.send();

    soundObj.play = function(time) {
        playSound = audioContext.createBufferSource();
        playSound.buffer = soundObj.soundToPlay;
        playSound.connect(audioContext.destination);
        playSound.start(audioContext.currentTime + time || audioContext.currentTime);
    };

    soundObj.stop = function(time) {
        playSound.stop(audioContext.currentTime + time || audioContext.currentTime);
    };
    return soundObj;
}

function audioBatchLoader(obj) {

    for (var prop in obj) {
        obj[prop] = audioFileLoader(obj[prop]);

    }

    return obj;

}