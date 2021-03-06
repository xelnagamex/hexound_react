import { createStore, applyMiddleware  } from 'redux';
import reduxThunk from 'redux-thunk';
import { palayerRedusers } from './redusers';
import { setPercent, onEnded } from './actions';

const ChiptuneJsPlayer = (window.hasOwnProperty('ChiptuneJsPlayer')) ? window.ChiptuneJsPlayer : null;

if(ChiptuneJsPlayer){
    ChiptuneJsPlayer.prototype.getPosition = function() {
        const Module = window.Module;
        if(this.currentPlayingNode && this.currentPlayingNode.hasOwnProperty('modulePtr')){
          return Module._openmpt_module_get_position_seconds(this.currentPlayingNode.modulePtr);
        } else {
          return 0;
        }        
    }
    ChiptuneJsPlayer.prototype.createLibopenmptNode = function(buffer, config) {
        // TODO error checking in this whole function
        const libopenmpt  = window.Module;

        var maxFramesPerChunk = 4096;
        var processNode = this.context.createScriptProcessor(2048, 0, 2);
        processNode.config = config;
        processNode.player = this;
        var byteArray = new Int8Array(buffer);
        var ptrToFile = libopenmpt._malloc(byteArray.byteLength);
        libopenmpt.HEAPU8.set(byteArray, ptrToFile);
        processNode.modulePtr = libopenmpt._openmpt_module_create_from_memory(ptrToFile, byteArray.byteLength, 0, 0, 0);
        processNode.paused = false;
        processNode.leftBufferPtr  = libopenmpt._malloc(4 * maxFramesPerChunk);
        processNode.rightBufferPtr = libopenmpt._malloc(4 * maxFramesPerChunk);
        processNode.cleanup = function() {
          if (this.modulePtr != 0) {
            libopenmpt._openmpt_module_destroy(this.modulePtr);
            this.modulePtr = 0;
          }
          if (this.leftBufferPtr != 0) {
            libopenmpt._free(this.leftBufferPtr);
            this.leftBufferPtr = 0;
          }
          if (this.rightBufferPtr != 0) {
            libopenmpt._free(this.rightBufferPtr);
            this.rightBufferPtr = 0;
          }
        }
        processNode.stop = function() {
          this.disconnect();
          this.cleanup();
        }
        processNode.pause = function() {
          this.paused = true;
        }
        processNode.unpause = function() {
          this.paused = false;
        }
        processNode.togglePause = function() {
          this.paused = !this.paused;
        }
        processNode.onaudioprocess = function(e) {
          
          processNode.player.fireEvent('onAudioprocess', e);
      
          var outputL = e.outputBuffer.getChannelData(0);
          var outputR = e.outputBuffer.getChannelData(1);
          var framesToRender = outputL.length;
          if (this.ModulePtr == 0) {
            for (var i = 0; i < framesToRender; ++i) {
              outputL[i] = 0;
              outputR[i] = 0;
            }
            this.disconnect();
            this.cleanup();
            return;
          }
          if (this.paused) {
            for (var i = 0; i < framesToRender; ++i) {
              outputL[i] = 0;
              outputR[i] = 0;
            }
            return;
          }
          var framesRendered = 0;
          var ended = false;
          var error = false;
          while (framesToRender > 0) {
            var framesPerChunk = Math.min(framesToRender, maxFramesPerChunk);
            var actualFramesPerChunk = libopenmpt._openmpt_module_read_float_stereo(this.modulePtr, this.context.sampleRate, framesPerChunk, this.leftBufferPtr, this.rightBufferPtr);
            if (actualFramesPerChunk == 0) {
              ended = true;
              // modulePtr will be 0 on openmpt: error: openmpt_module_read_float_stereo: ERROR: module * not valid or other openmpt error
              error = !this.modulePtr;
            }
            var rawAudioLeft = libopenmpt.HEAPF32.subarray(this.leftBufferPtr / 4, this.leftBufferPtr / 4 + actualFramesPerChunk);
            var rawAudioRight = libopenmpt.HEAPF32.subarray(this.rightBufferPtr / 4, this.rightBufferPtr / 4 + actualFramesPerChunk);
            for (var i = 0; i < actualFramesPerChunk; ++i) {
              outputL[framesRendered + i] = rawAudioLeft[i];
              outputR[framesRendered + i] = rawAudioRight[i];
            }
            for (var i = actualFramesPerChunk; i < framesPerChunk; ++i) {
              outputL[framesRendered + i] = 0;
              outputR[framesRendered + i] = 0;
            }
            framesToRender -= framesPerChunk;
            framesRendered += framesPerChunk;
          }
          if (ended) {
            this.disconnect();
            this.cleanup();
            error ? processNode.player.fireEvent('onError', {type: 'openmpt'}) : processNode.player.fireEvent('onEnded');
          }
        }
        return processNode;
      }
    ChiptuneJsPlayer.prototype.setPosition = function(postion){
      const Module = window.Module;
      Module._openmpt_module_set_position_seconds(this.currentPlayingNode.modulePtr, postion)
    }

    ChiptuneJsPlayer.prototype.setPositionByPercent = function(percent){
      const Module = window.Module;
      const postion = this.duration() * percent
      this.setPosition(postion);
      
    }
}


const getPlayer = () => {
    const ChiptuneJsConfig = window.ChiptuneJsConfig;
    const ChiptuneJsPlayer = window.ChiptuneJsPlayer;
    const player = new ChiptuneJsPlayer(new ChiptuneJsConfig(0));
    window.__PLAYER__ = player;

    return player;
}

const defaultState = {
    playerData: {
        trackList: [],
        isPlay: false,
        currentTrack: null,
        player: getPlayer(),
        currentPlayingNode: null,
    }    
}

export const store = createStore(palayerRedusers, defaultState, applyMiddleware(reduxThunk));

// Add Player handlers

(function(store){
    const player = window.__PLAYER__;

    player.handlers.push({eventName: 'onEnded', handler: function(params) {
      store.dispatch(onEnded());
  }})
  player.addHandler('onAudioprocess', function(e){
      const postion = window.__PLAYER__.getPosition();
      if(postion !== 0){
        const duration = window.__PLAYER__.duration();
        const percent  = parseFloat(postion) / parseFloat(duration);
        store.dispatch(setPercent(percent));
      } else {
        store.dispatch(setPercent(0));
      }
      
  })

})(store)