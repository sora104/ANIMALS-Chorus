"use strict";


var audioContext = new AudioContext();

function audioFileLoader(fileDirectory) {
    var soundObj = {};
    var playSound = undefined;
    soundObj.fileDirectory = fileDirectory;
    var getSound = new XMLHttpRequest();
    getSound.open("GET", soundObj.fileDirectory, true);
    getSound.responseType = "arraybuffer";
    getSound.onload = function() {
        audioContext.decodeAudioData(getSound.response, function(buffer) {
            soundObj.soundToPlay = buffer;

        });
    };

    getSound.send();

    soundObj.play = function(time) {
        var sounds = audioContext.createBufferSource();
        sounds.buffer = soundObj.soundToPlay;
        var merger = audioContext.createChannelMerger(2);
        var splitter = audioContext.createChannelSplitter(2);
        var leftDelay = audioContext.createDelay();
        var rightDelay = audioContext.createDelay();
        var leftFeedback = audioContext.createGain();
        var rightFeedback = audioContext.createGain();

        sounds.connect(splitter);
        sounds.connect(audioContext.destination);
        splitter.connect(leftDelay, 0);
        leftDelay.delayTime.value = 0.5;
        leftDelay.connect(leftFeedback);
        leftFeedback.gain.value = 0.6;
        leftFeedback.connect(rightDelay);
        splitter.connect(rightDelay, 1);
        rightDelay.delayTime.value = 0.5;
        rightFeedback.gain.value = 0.6;
        rightDelay.connect(rightFeedback);
        rightFeedback.connect(leftDelay);
        leftFeedback.connect(merger, 0, 0);
        rightFeedback.connect(merger, 0, 1);

        merger.connect(audioContext.destination);
        sounds.start(audioContext.currentTime);
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

var sound = audioBatchLoader({
    stereoDrumLoop: "sounds/Tom.wav"
});