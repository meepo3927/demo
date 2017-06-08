/**
 * @描述  音乐播放器, 依赖jQuery
 * @用法  new MPlayer(elem, options);
 * options = {
 *     src: 'xxx/1.mp3',
 *     autoPlay: false,    自动播放, 默认false
       loop: false         循环播放, 默认false     
 * }
 * @方法  load(url) ,  加载歌曲
 */

(function (name, factory) {
    if (typeof define === 'function' && (define.amd || define.cmd)) {
        define(['jquery'], factory);
    } else {
        window[name] = factory(window.jQuery);
    }
}('MPlayer', function ($) {
    "use strict";
    if (!$) {
        throw new Error('[MPlayer] jQuery is not found.');
    }

    var HTML5Supported = (function () {
        var e = document.createElement('audio');
        return (typeof e.canPlayType !== 'undefined');
    })();
    var holderClassName = 'audiojs';
    var className = {
        playBtn: 'play',
        pauseBtn: 'pause',
        loadingIcon: 'loading',
        errorIcon: 'error',
        progressBar: 'progress',
        loadedBar: 'loaded',
        playedTime: 'played',
        duration: 'duration',
        errmsg: 'error-message'
    };
    var jClassName = {};
    for (var p in className) {
        if (!className.hasOwnProperty(p)) {
            continue;
        }
        jClassName['.' + p] = className[p];
    }
    var getHolderHtml = function () {
        return [
            '<div class="play-pause">',
                '<p class="' + className.playBtn + '"></p>',
                '<p class="' + className.pauseBtn + '"></p>',
                '<p class="' + className.loadingIcon + '"></p>',
                '<p class="' + className.errorIcon + '"></p>',
            '</div>',
            '<div class="scrubber">',
                '<div class="' + className.progressBar + '"></div>',
                '<div class="' + className.loadedBar + '"></div>',
            '</div>',
            '<div class="time">',
                '<em class="' + className.playedTime + '">00:00</em>',
                '/',
                '<strong class="' + className.duration + '">00:00</strong>',
            '</div>',
            '<div class="' + className.errmsg + '"></div>'
        ].join('');
    };
    var getAudioHtml = function (options) {
        var src = options.src || '';
        if (HTML5Supported) {
            return [
                '<audio preload="auto" src="' + src + '" ></audio>'
            ].join('');
        }
        return '';
    };
    var padZero = function (num, len) {
        len = len || 2;
        num = num + '';
        var count = len - num.length;
        for (var i = 0; i < count; i++) {
            num = '0' + num;
        }
        return num;
    };

    var getTimeHtml = function (time) {
        if (!time) {
            return '00:00';
        }
        var minute = Math.floor(time / 60);
        var second = Math.floor(time % 60);
        var html = padZero(minute) + ':' + padZero(second);
        return html;
    };

    var bindEventList = [
        'loadstart', 'progress', 'error',
        'canplaythrough', 'canplay',
        'play', 'pause', 'ended',
        'timeupdate'
    ];

    function Player(elem, options) {
        options = options || {};
        this.$elem = this.getElem(elem);
        if (!this.$elem || !this.$elem[0]) {
            return;
        }
        this.options = options;
        this.init();
    }

    var proto = Player.prototype;

    /**
     * 加载歌曲
     * @param  {string} url
     */
    proto.load = function (url) {
        this.options.src = url;
        this.audio.setAttribute('src', url);
    };
    /**
     * 播放
     */
    proto.play = function () {
        this.audio.play();
    };
    /**
     * 暂停
     */
    proto.pause = function () {
        this.audio.pause();
    };
    /**
     * 跳
     */
    proto.skipTo = function (percent) {
        var t = this.audio.duration * percent;
        this.audio.currentTime = t;
    };
    /**
     * 销毁
     */
    proto.dispose = function () {
        if (this.audio) {
            this.unbindHTML5();
        }
        this.unbindEvents();
        this.$elem.html('');
        this.$elem.removeClass(holderClassName);
    };
    proto.delay = function (f, time) {
        time = time || 1000;
        var self = this;
        var timer = setTimeout(function () {
            f.call(self);
        }, time);
        return function () {
            clearTimeout(timer);
        };
    };
    /**
     * 初始化，生成HTML，绑定事件
     */
    proto.init = function () {
        this.changeState('init');
        this.$elem.addClass(holderClassName);
        this.$elem.html(
            getAudioHtml(this.options) + 
            getHolderHtml()
        );
        // define children 
        for (var i in className) {
            this['$' + i] = this.$elem.find('.' + className[i]); 
        }

        // define audio element
        this.audio = this.$elem.children('audio')[0];
        if (this.audio) {
            this.bindHTML5();
        }
        this.bindEvents();
    };
    proto.bindEvents = function () {
        var self = this;
        this.$elem.on('click', '.play', function (e) {
            if (self.status === 'init') {
                return false;
            }
            self.play();
        });
        this.$elem.on('click', '.pause', function (e) {
            self.pause();
        });
        this.$elem.on('click', '.scrubber', function (e) {
            var $ber = $(this);
            var x = e.clientX - $ber.offset().left;
            self.skipTo(x / $ber.width());
        });
    };
    proto.unbindEvents = function () {
        this.$elem.off('click', '.play');
        this.$elem.off('click', '.pause');
        this.$elem.off('click', '.scrubber');
    };
    proto.changeState = function (status) {
        if (this.status) {
            this.$elem.removeClass(this.status);
        }
        this.status = status;
        this.$elem.addClass(status);
    };
    proto.renderDuration = function () {
        this.$playedTime.html(getTimeHtml(this.audio.currentTime));
        this.$duration.html(getTimeHtml(this.audio.duration));
    };
    proto.renderCurrentProgress = function () {
        this.renderDuration();
        var n = parseInt(
            (100 * this.audio.currentTime) / this.audio.duration,
            10
        );
        this.$progressBar.css('width', n + '%');
    };

    proto.renderLoaded = function (percent) {
        this.$loadedBar.css('width', percent + '%');
    };
    proto.bindHTML5 = function () {
        for (var i = 0; i < bindEventList.length; i++) {
            let name = bindEventList[i];
            this.audio.addEventListener(name, this, false);
        }
    };
    proto.unbindHTML5 = function () {
        for (var i = 0; i < bindEventList.length; i++) {
            let name = bindEventList[i];
            this.audio.removeEventListener(name, this, false);
        }
    };
    proto.handleLoadstart = function (e) {
        this.changeState('loading');
    };
    proto.handleCanplay = function (e) {
        if (this.status === 'loading') {
            if (this.options.autoPlay) {
                this.play();
            }
        }
        this.$elem.removeClass('loading');
        this.renderDuration();
        this.renderLoaded(100);
    };
    proto.handlePlay = function (e) {
        this.changeState('playing');
    };
    proto.handlePause = function (e) {
        this.changeState('paused');
    };
    proto.handleTimeupdate = function (e) {
        this.renderCurrentProgress();
    };
    proto.handleEnded = function (e) {
        this.skipTo(0);
        if (this.options.loop) {
            this.delay(function () {
                this.play();
            }, 1000);
        }
    };
    proto.handleProgress = function (e) {
    };
    proto.handleError = function (e) {
        if (this.options.src) {
            this.changeState('error');
            this.$errmsg.html('加载失败: ' + this.options.src);
        } else {
            this.changeState('init');
        }
    };
    proto.handleEvent = function (e) {
        var eventName = 'handle-' + e.type.toLowerCase();
        var type = e.type.charAt(0).toUpperCase() + e.type.substr(1);
        var methodsName = 'handle' + type;
        if (typeof this[methodsName] === 'function') {
            this[methodsName](e);
        } else {
            LOG('Handle Event:' + methodsName);
        }
    };
    proto.getElem = function (el) {
        if (!el) {
            return null;
        }
        if (el.jquery) {
            return el;
        }
        if (el.nodeType === 1) {
            return $(el);
        }
        if (typeof el === 'string') {
            var elem = document.getElementById(el);
            if (elem) {
                return $(elem);
            }
            return $(el);
        }
        return $(el);
    };
    
    return Player;
}));