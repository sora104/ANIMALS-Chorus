"use strict";

function audioContextCheck(){
    if(typeof AudioContext !== "undefined"){
        return new AudioContext();
    }
    else if (typeof webkitAudioContext !== "undefined"){
        return new webkitAudioContext();
    }
    else if(typeof mozAudioContext !== "undefined"){
        return new mozAudioContext();
    }
    else{
        throw new Error('AudioContext not supported')
    }
}
var audioContext = audioContextCheck();
var analyser=audioContext.createAnalyser();

function audioFileLoader(fileDirectory) {
    var playSound = undefined;
    var soundObj = {};
    soundObj.fileDirectory = fileDirectory;
    var getSound = new XMLHttpRequest();
    getSound.open("GET", soundObj.fileDirectory, true);
    getSound.responseType = "arraybuffer";
    getSound.onload = function() {
        audioContext.decodeAudioData(getSound.response, function(buffer) {
            soundObj.soundToPlay = buffer;
            $(".transport-icon").show();
        });

    };

    getSound.send();

    soundObj.play = function(time) {
        playSound = audioContext.createBufferSource();
        playSound.buffer = soundObj.soundToPlay;
        parametricEQ(playSound, analyser);
        //_______________________________ visualization
        analyser.connect(audioContext.destination);
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


var sound = audioBatchLoader({
    song: "sounds/song.mp3"


});

var playing = false;


function onInputFileChange() {  
   var file = document.getElementById('file').files[0];  
   var url = URL.createObjectURL(file); 
   //////////////////////////////////////
   if(playing){
     playing = false;
     sound.song.stop();
     $(".transport-icon").attr("src", "image/play.png");
   }
   //////////////////////////// 
   $(".transport-icon").hide();
   sound=audioBatchLoader({
      song: url
   });
  // document.getElementById("audio_id").src = url;  
} 

$(function playit() {
    $(".transport-icon").on("click", function() { 
        if (!playing) {
            playing = true;
            sound.song.play();
            $(".transport-icon").attr("src", "image/stop.png");

        } else {
            playing = false;
            sound.song.stop();
            $(".transport-icon").attr("src", "image/play.png");
        }

    });

});