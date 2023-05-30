"use strict";

$(function() {
    $(".freqDial").knob({

        change: function(valueFreqDial) {
            parametricEQ1.frequency.value = valueFreqDial;


        }
    });

    $(".bandwidthDial").knob({

        change: function(valueBandwidthDial) {
            parametricEQ1.Q.value = valueBandwidthDial;

        }
    });

    $(".gainDial").knob({

        change: function(valueGainDial) {
            parametricEQ1.gain.value = valueGainDial;


        }
    });


    $(".transport-icon").hide();

   //_______________________________BEGIN visualization
    canvas.style.border="1px solid #CCC";
    var width=canvas.width,height=canvas.height;
    var g=canvas.getContext("2d");
    g.translate(0.5,0.5);
    analyser.fftSize = 256;
    //计算出采样比率44100所需的缓冲区长度
    var length=analyser.frequencyBinCount*44100/audioContext.sampleRate|0;
    //创建数据
    console.log(length);
    //length=1500;
    var output_f=new Uint8Array(length);

    function update() {
        analyser.getByteFrequencyData(output_f);
        //将缓冲区的数据绘制到Canvas上
        g.clearRect(-0.5,-0.5,width,height);
        g.beginPath(),g.moveTo(0,height);
        for(var i=0;i<width;i++){
           g.lineTo(i,height-height*output_f[Math.round(length*i/width)]/255);
        }
        g.lineTo(i,height),g.fill();
            //请求下一帧
        requestAnimationFrame(update);
        }

    update();
   
    //_______________________________END visualization

});