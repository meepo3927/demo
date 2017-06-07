(function (window, document, undefined) {

    var instanceIndex = 1;

    var types = [
        'mp3',
        'ogg',
        'wav'
    ];

    function MPlayer(options) {
        this.options = options || {};
        this.audioElem = document.createElement('audio');
        this.supportsAudio = (typeof this.audioElem.canPlayType !== 'undefined');
        this.initHolder();
        this.initEnv();
    }
    var proto = MPlayer.prototype;
    proto.play = function () {
        if (this.supportsAudio) {
            return this.html5Play();
        } else {
            return this.flashPlay();
        }
    };
    proto.pause = function () {
        if (this.supportsAudio) {
            return this.html5Pause();
        } else {
            return this.flashPause();
        }
    };

    /**
     * HTML5事件
     */
    proto.html5Play = function () {
        if (!this.ready) {
            return false;
        }
        try {
            this.audioElem.play();
            return true;
        } catch (e) {
            return false;
        }
    };
    proto.html5Pause = function () {
        try {
            this.audioElem.pause();
            return true;
        } catch (e) {
            return false;
        }
    };
    proto.initHtml5 = function () {
        var self = this;
        this.audioElem.onloadeddata = function () {
            self.ready = true;
        };
        this.ready = false;
        for (var i = 0; i < types.length; i++) {
            var type = types[i];
            if (this.options[type] && this.audioElem.canPlayType('audio/' + type)) {
                this.audioType = type;
                this.audioElem.src = this.options[type];
                this.audioElem.load();
                break;
            }
        }
    };

    /**
     * nplayer Flash事件
     * play, stop, pause, playToggle, reset ,load
     */
    proto.flashAction = function (action) {
        if (typeof this.flashObject.PercentLoaded === 'undefined') {
            return false;
        }
        if (this.flashObject.PercentLoaded() < 100) {
            return false;
        }
        if (typeof this.flashObject.TCallLabel === 'undefined') {
            return false;
        }
        var state = this.flashObject.GetVariable('loadingState');
        this.flashObject.TCallLabel('/', action);
        return true;
    };
    // nplayer
    proto.flashSetVar = function (eventName, action) {
        return this.flashObject.SetVariable(eventName, action);
        // currentSong, xx
        // eventName is a string with one of the following values: 
        //     onPlay, onStop, onPause, onError, 
        //     onSongOver, onBufferingComplete, onBufferingStarted
        // action is a string with the javascript code to run.
    };
    // nplayer
    proto.flashGetVar = function (name) {
        return this.flashObject.GetVariable(name);
        // this.flashObject.GetVariable()
        // playingState
        // loadingState
        // returns
        //   'empty' if no file is loaded
        //   'loading' if file is loading
        //   'playing' if user has pressed play AND file has loaded
        //   'stopped' if not empty and file is stopped
        //   'paused' if file is paused
        //   'finished' if file has finished playing
        //   'error' if an error occurred
    };
    proto.flashPlay = function () {
        if (!this.ready) {
            return false;
        }
        return this.flashObject.fl_play();
    };
    proto.flashPause = function () {
        if (!this.ready) {
            return false;
        }
        return this.flashObject.fl_pause();
    };
    proto.initFlash = function () {
        var self = this;
        try {
            if (this.options.mp3) {
                this.flashObject.fl_setAudio_mp3(this.options.mp3);
                this.flashObject.fl_load();
                this.ready = true;
            }
        } catch(e) {
            setTimeout(function () {
                self.initFlash();
            }, 300);
        }
    };

    /**
     * 初始化事件
     */
    proto.initEnv = function () {
        var self = this;
        if (this.supportsAudio) {
            // for-test
            this.audioElem.setAttribute('controls', 'controls');

            this.audioElem.setAttribute('preload', 'preload');
            this.holder.appendChild(this.audioElem);
            this.initHtml5();
        } else {
            this.flashObject = this.createFlashObject();
            this.holder.appendChild(this.flashObject);
            // this.initFlash();
            setTimeout(function () {
                self.initFlash();
            }, 300);
        }
    };
    proto.initHolder = function () {
        var holder = this.options.holder;
        if (typeof holder === 'string') {
            holder = document.getElementById(holder);
        }
        if (!holder) {
            holder = document.createElement('div');
            document.body.appendChild(holder);
        }
        this.holder = holder;
    };
    proto.createFlashObject = function () {
        var id = 'mplayer_object_' + (instanceIndex++);
        var swfPath = this.getSwfPath();
        var flashVars = 'jQuery=jQuery&id=' + encodeURIComponent(id) + '&vol=100';
        try {
            var obj = document.createElement([
                '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" ',
                    // 'codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab" ',
                    'width="165" ',
                    'height="37" ',
                    'tabindex="-1" ',
                    'id="' + id + '" >',
                '</object>'
            ].join(''));

            var paramStr = [
                '<param name="movie" value="' + swfPath + '" />',
                '<param name="FlashVars" value="' + flashVars + '" />',
                '<param name="allowScriptAccess" value="always" />',
                '<param name="bgcolor" value="#ffffff" />',
                '<param name="quality" value="high" />',
                '<param name="wmode" value="opaque" />' // window, opaque, transparent
            ];
            for (var i = 0; i < paramStr.length; i++) {
                obj.appendChild(document.createElement(paramStr[i]));
            }
            return obj;
        } catch(e) {
            var embed = document.createElement('embed');
            var attrs = {
                src: swfPath,
                quality: 'high',
                bgcolor: '#FFFFFF',
                width: '165',
                height: '37',
                name: id,
                flashvars: flashVars,
                type: 'application/x-shockwave-flash',
                swLiveConnect: 'true'
            };
            // pluginspage="http://www.macromedia.com/go/getflashplayer"
            for (var i in attrs) {
                embed.setAttribute(i, attrs[i]);
            }
            return embed;
        }
    };
    proto.getSwfPath = function () {
        /*
        var path = this.options.swfPath || 'nplayer.swf';
        if (this.options.mp3) {
            path += '?file=' + this.options.mp3 + '&as=0';
        }
        */
        var path = this.options.swfPath || 'jplayer.swf';
        return path;
    };

    window.MPlayer = MPlayer;
})(window, document);
