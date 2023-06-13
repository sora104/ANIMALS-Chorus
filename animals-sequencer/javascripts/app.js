//audio node variables
var context;
var convolver;
var compressor;
var masterGainNode;
var effectLevelNode;
var equalizerNode;

var noteTime;
var startTime;
var lastDrawTime = -2;
var LOOP_LENGTH = 16;
var rhythmIndex = 0;
var timeoutId;
var testBuffer = null;

var currentKit = null;
var reverbImpulseResponse = null;

var tempo = 40;
var TEMPO_MAX = 120;
var TEMPO_MIN = 10;
var TEMPO_STEP = 1;

if (window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext')) {
  window.webkitAudioContext = AudioContext;
}

$(function() {
  init();
  toggleSelectedListener();
  playPauseListener();
  lowPassFilterListener();
  reverbListener();
  distortionListener();
  createLowPassFilterSliders();
  initializeTempo();
  changeTempoListener();
});

function createLowPassFilterSliders() {
  $("#freq-slider").slider({
    value: 0.6,
    min: 0,
    max: 1,
    step: 0.01,
    disabled: true,
    slide: changeFrequency
  });
  $("#gain-slider").slider({
    value: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
    disabled: true,
    slide: changeEQ
  });
}

function lowPassFilterListener() {
  $('#eq').click(function() {
    $(this).toggleClass("active");
    $(this).blur();
    if ($(this).hasClass("btn-default")) {
      $(this).removeClass("btn-default");
      $(this).addClass("btn-warning");
      equalizerNode.active = true;
      $("#freq-slider,#gain-slider").slider( "option", "disabled", false );
    }
    else {
      $(this).addClass("btn-default");
      $(this).removeClass("btn-warning");
      equalizerNode.active = false;
      $("#freq-slider,#gain-slider").slider( "option", "disabled", true );
    }
  })
}

function reverbListener() {
  $("#reverb").click(function() {
    $(this).toggleClass("active");
    $(this).blur();
    if ($(this).hasClass("btn-default")) {
      $(this).removeClass("btn-default");
      $(this).addClass("btn-warning");
      convolver.active = true;
    }
    else {
      $(this).addClass("btn-default");
      $(this).removeClass("btn-warning");
      convolver.active = false;
    }
  })
}

function distortionListener() {
  $("#distortion").click(function() {
    $(this).toggleClass("active");
    $(this).blur();
    if ($(this).hasClass("btn-default")) {
      $(this).removeClass("btn-default");
      $(this).addClass("btn-warning");
      distortion.active = true;
    }
    else {
      $(this).addClass("btn-default");
      $(this).removeClass("btn-warning");
      distortion.active = false;
    }
  })
}

function changeFrequency(event, ui) {
  var minValue = 40;
  var maxValue = context.sampleRate / 2;
  var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
  var multiplier = Math.pow(2, numberOfOctaves * (ui.value - 1.0));
  equalizerNode.frequency.value = maxValue * multiplier;
}

function changeEQ(event, ui) {
  //30 is the quality multiplier, for now. 
  equalizerNode.Q.value = ui.value * 30;
}

function playPauseListener() {
  $('#play-pause').click(function() {
    var $span = $(this).children("span");
    if($span.hasClass('glyphicon-play')) {
      $span.removeClass('glyphicon-play');
      $span.addClass('glyphicon-pause');
      handlePlay();
    } 
    else {
      $span.addClass('glyphicon-play');
      $span.removeClass('glyphicon-pause');
      handleStop();
    }
  });
}

function toggleSelectedListener() {
  $('.pad').click(function() {
    $(this).toggleClass("selected");
  });
}

function init() {
  initializeAudioNodes();
  loadKits();
  loadImpulseResponses();
}

function initializeAudioNodes() {
  context = new webkitAudioContext();
  var finalMixNode;
  if (context.createDynamicsCompressor) {
      // Create a dynamics compressor to sweeten the overall mix.
      compressor = context.createDynamicsCompressor();
      compressor.connect(context.destination);
      finalMixNode = compressor;
  } else {
      // No compressor available in this implementation.
      finalMixNode = context.destination;
  }


  // Create master volume.
  // for now, the master volume is static, but in the future there will be a slider
  masterGainNode = context.createGain();
  masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
  masterGainNode.connect(finalMixNode);

  //connect all sounds to masterGainNode to play them

  //don't need this for now, no wet dry mix for effects
  // // Create effect volume.
  // effectLevelNode = context.createGain();
  // effectLevelNode.gain.value = 1.0; // effect level slider controls this
  // effectLevelNode.connect(masterGainNode);

  // Create convolver for effect
  convolver = context.createConvolver();
  convolver.active = false;
  // convolver.connect(effectLevelNode);

  //Create Low Pass Filter
  equalizerNode = context.createBiquadFilter();
  //this is for backwards compatibility, the type used to be an integer
  equalizerNode.type = "lowpass"; // LOWPASS
  //default value is max cutoff, or passing all frequencies
  equalizerNode.frequency.value = context.sampleRate / 2;
  equalizerNode.connect(masterGainNode);
  equalizerNode.active = false;

  
  distortion = context.createWaveShaper();
  distortion.active = false;

  function makeDistortionCurve(amount) {
    var k = typeof amount === 'number' ? amount : 50,
      n_samples = 44100,
      curve = new Float32Array(n_samples),
      deg = Math.PI / 180,
      i = 0,
      x;
    for ( ; i < n_samples; ++i ) {
      x = i * 2 / n_samples - 1;
      curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
  };

  distortion.curve = makeDistortionCurve(400);
  distortion.oversample = '4x';

  analyser = context.createAnalyser();

}

function loadKits() {
  //name must be same as path
  var kit = new Kit("animals");
  kit.load();

  //TODO: figure out how to test if a kit is loaded
  currentKit = kit;
}

function loadImpulseResponses() {
  reverbImpulseResponse = new ImpulseResponse("sounds/impulse-responses/matrix-reverb2.wav");
  reverbImpulseResponse.load();
}


//TODO delete this
function loadTestBuffer() {
  var request = new XMLHttpRequest();
  var url = "http://www.freesound.org/data/previews/102/102130_1721044-lq.mp3";
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  request.onload = function() {
    context.decodeAudioData(
      request.response,
      function(buffer) { 
        testBuffer = buffer;
      },
      function(buffer) {
        console.log("Error decoding drum samples!");
      }
    );
  }
  request.send();
}

//TODO delete this
function sequencePads() {
  $('.pad.selected').each(function() {
    $('.pad').removeClass("selected");
    $(this).addClass("selected");
  });
}

function parametric(inputConnection, outputConnection) {
  inputConnection.connect(masterGainNode);
  masterGainNode.connect(outputConnection);
}

function playNote(buffer, noteTime) {
  var voice = context.createBufferSource();
  voice.buffer = buffer;

  var currentLastNode = masterGainNode;
  if (equalizerNode.active) {
    equalizerNode.connect(currentLastNode);
    currentLastNode = equalizerNode;
  }
  if (convolver.active) {
    convolver.buffer = reverbImpulseResponse.buffer;
    convolver.connect(currentLastNode);
    currentLastNode = convolver;
  }
  if (distortion.active) {
    distortion.connect(currentLastNode);
    currentLastNode = distortion;
  }

  voice.connect(currentLastNode);
  voice.start(noteTime);

  parametric(voice, analyser);
  analyser.connect(context.destination);
}

function schedule() {
  var currentTime = context.currentTime;

  // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
  currentTime -= startTime;

  while (noteTime < currentTime + 0.200) {
      var contextPlayTime = noteTime + startTime;
      var $currentPads = $(".column_" + rhythmIndex);
      $currentPads.each(function() {
        if ($(this).hasClass("selected")) {
          var instrumentName = $(this).parents().data("instrument");
          switch (instrumentName) {
          case "gu":
            playNote(currentKit.guBuffer, contextPlayTime);
            break;
          case "miao":
            playNote(currentKit.miaoBuffer, contextPlayTime);
            break;
          case "duck":
            playNote(currentKit.duckBuffer, contextPlayTime);
            break;
          case "dog":
            playNote(currentKit.dogBuffer, contextPlayTime);
            break;
          case "ma":
            playNote(currentKit.maBuffer, contextPlayTime);
            break;
          case "mou":
            playNote(currentKit.mouBuffer, contextPlayTime);
            break;
          case "ta":
            playNote(currentKit.taBuffer, contextPlayTime);
            break;
        }
          //play the buffer
          //store a data element in the row that tells you what instrument
        }
      });
      if (noteTime != lastDrawTime) {
          lastDrawTime = noteTime;
          drawPlayhead(rhythmIndex);
      }
      advanceNote();
  }

  timeoutId = requestAnimationFrame(schedule)
}

function drawPlayhead(xindex) {
    var lastIndex = (xindex + LOOP_LENGTH - 1) % LOOP_LENGTH;

    //can change this to class selector to select a column
    var $newRows = $('.column_' + xindex);
    var $oldRows = $('.column_' + lastIndex);
    
    $newRows.addClass("playing");
    $oldRows.removeClass("playing");
}

function advanceNote() {
    // Advance time by a 16th note...
    // var secondsPerBeat = 60.0 / theBeat.tempo;
    //TODO CHANGE TEMPO HERE, convert to float
    tempo = Number($("#tempo-input").val());
    var secondsPerBeat = 60.0 / tempo;
    rhythmIndex++;
    if (rhythmIndex == LOOP_LENGTH) {
        rhythmIndex = 0;
    }
   
    //0.25 because each square is a 16th note
    noteTime += 0.25 * secondsPerBeat
    // if (rhythmIndex % 2) {
    //     noteTime += (0.25 + kMaxSwing * theBeat.swingFactor) * secondsPerBeat;
    // } else {
    //     noteTime += (0.25 - kMaxSwing * theBeat.swingFactor) * secondsPerBeat;
    // }

}

function handlePlay(event) {
    rhythmIndex = 0;
    noteTime = 0.0;
    startTime = context.currentTime + 0.005;
    schedule();
}

function handleStop(event) {
  cancelAnimationFrame(timeoutId);
  $(".pad").removeClass("playing");
}

function initializeTempo() {
  $("#tempo-input").val(tempo);
}

function changeTempoListener() {
  $("#increase-tempo").click(function() {
    if (tempo < TEMPO_MAX) {
      tempo += TEMPO_STEP;
      $("#tempo-input").val(tempo);
    }
  });

  $("#decrease-tempo").click(function() {
    if (tempo > TEMPO_MIN) {
      tempo -= TEMPO_STEP;
      $("#tempo-input").val(tempo);
    } 
  });
}