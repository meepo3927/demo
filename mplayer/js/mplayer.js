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
    var nt = navigator;
    var hasFlash = function () {
        var p = nt.plugins || {};
        if (p.length && p['Shockwave Flash']) {
            return true;
        }
        var m = nt.mimeTypes || {};
        if (m.length) {
            var mimeType = m['application/x-shockwave-flash'];
            return (mimeType && mimeType.enabledPlugin);
        }

        try {
            var ax = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
            return true;
        } catch (e) {}

        return false;
    };

    var getSwf = function (name) {
        var swf = document[name] || window[name] || [];
        return swf.length > 1 ? swf[swf.length - 1] : swf;
    };

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
    var getUniqueId = (function () {
        var i = 1000;
        return function () {
            var r = parseInt(Math.random() * 100000, 10);
            return 'mplayer_' + (++i) + r;
        };
    })();
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
    var getFlashHtml = function (m) {
        var style = 'position: absolute; left: -1px;';
        var size = 'width="1" height="1"';
        var name = 'name="${id}"';
        var v = "${path}?playerInstance=mPlayerInstances['${id}']&datetime=${datetime}";
        var objectAttrs = [
            'classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"',
            'id="${id}"',
            'style="' + style + '"',
            name,
            size,
        ].join(' ');
        var embedAttrs = [
            name, size,
            'src="' + v + '"',
            'allowscriptaccess="always"'
        ].join(' ');
        var str = [
            '<object ' + objectAttrs + '>',
                '<param name="movie" value="' + v + '">',
                '<param name="allowscriptaccess" value="always">',
                '<embed ' + embedAttrs + '>',
            '</object>'
        ].join('');
        var path = m.options.swfPath || 'swf/mplayer.swf';
        str = str.replace(/\${id}/g, m.id);
        str = str.replace(/\${path}/g, path);
        str = str.replace(/\${datetime}/g, (+new Date + Math.random()));
        return str;
    };

    var getAudioHtml = function (m) {
        var src = m.options.src || '';
        if (HTML5Supported) {
            return [
                '<audio preload="auto" src="' + src + '" ></audio>'
            ].join('');
        }
        if (hasFlash()) {
            return getFlashHtml(m);
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
    var instances = {};
    window.mPlayerInstances = instances;
    function Player(elem, options) {
        options = options || {};
        this.$elem = this.getElem(elem);
        if (!this.$elem || !this.$elem[0]) {
            return;
        }
        this.options = options;
        this.id = getUniqueId();
        instances[this.id] = this;
        this.init();
    }

    var proto = Player.prototype;

    /**
     * 加载歌曲
     * @param  {string} url
     */
    proto.reload = function (url) {
        this.options.src = url;
        this.dispose();
        this.init();
    };
    /**
     * 播放
     */
    proto.play = function () {
        // 没有获取到时长
        if (!this.duration) {
            return false;
        }
        // 状态不对
        if (this.status === 'init' || this.status === 'error') {
            return false;
        }

        if (this.audio) {
            this.audio.play();
        } else if (this.swf) {
            this.handlePlay();
            this.swf.pplay();
        }
    };
    /**
     * 暂停
     */
    proto.pause = function () {
        if (this.audio) {
            this.audio.pause();
        } else if (this.swf) {
            this.handlePause();
            this.swf.ppause();
        }
    };
    /**
     * 跳
     */
    proto.skipTo = function (percent) {
        var t = this.duration * percent;
        if (this.audio) {
            this.audio.currentTime = t;
        } else if (this.swf) {
            this.swf.skipTo(percent);
            this.renderCurrentProgress(percent);
        }
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
        this.duration = 0;
        this.changeState('init');
        this.$elem.addClass(holderClassName);
        this.$elem.html(
            getAudioHtml(this) + 
            getHolderHtml()
        );
        this.bindEvents();

        // define children 
        for (var i in className) {
            this['$' + i] = this.$elem.find('.' + className[i]); 
        }

        // define audio element
        var html5Audio = this.$elem.children('audio')[0];
        if (html5Audio) {
            this.audio = html5Audio;
            this.bindHTML5();
        } else if (hasFlash()) {
            var swf = getSwf(this.id);
            if (swf) {
                this.swf = swf;
            }
        }
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
    proto.renderPlayed = function (p) {
        if (this.audio) {
            this.$playedTime.html(getTimeHtml(this.audio.currentTime));
        } else if (p !== undefined) {
            var t = Math.round(this.duration * p);
            this.$playedTime.html(getTimeHtml(t));
        }
    };
    proto.renderDuration = function () {
        this.$duration.html(getTimeHtml(this.duration));
    };
    proto.renderCurrentProgress = function (p) {
        this.renderPlayed(p);
        var n = Math.round(p * 100);
        this.$progressBar.css('width', n + '%');
    };

    proto.renderLoaded = function (percent) {
        this.$loadedBar.css('width', percent + '%');
    };
    proto.bindHTML5 = function () {
        for (var i = 0; i < bindEventList.length; i++) {
            var name = bindEventList[i];
            this.audio.addEventListener(name, this, false);
        }
    };
    proto.unbindHTML5 = function () {
        for (var i = 0; i < bindEventList.length; i++) {
            var name = bindEventList[i];
            this.audio.removeEventListener(name, this, false);
        }
    };
    proto.handleLoadstart = function (e) {
        this.changeState('loading');
    };
    proto.handleCanplay = function (e) {
        if (this.audio && this.audio.duration) {
            this.duration = this.audio.duration;
        }
        this.$elem.removeClass('loading');
        this.renderDuration(0);
        this.renderLoaded(100);
        if (this.status === 'loading') {
            if (this.options.autoPlay) {
                this.play();
            }
        }
    };
    proto.handlePlay = function (e) {
        this.changeState('playing');
    };
    proto.handlePause = function (e) {
        this.changeState('paused');
    };
    proto.handleTimeupdate = function (e) {
        var p = (this.audio.currentTime) / this.duration;
        this.renderCurrentProgress(p);
    };
    proto.handleEnded = function (e) {
        this.skipTo(0);
        this.pause();
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
            // LOG('Handle Event:' + methodsName);
            this[methodsName](e);
        } else {
            // LOG('Unhandled Event:' + methodsName);
        }
    };

    /**
     * The below methods would be called by Flash
     */
    proto.loadStarted = function () {
        if (this.options.src) {
            this.swf.init(this.options.src);
        }
    };
    proto.loadProgress = function (percent, duration) {
        // LOG('loadProgress:' + percent);
        this.duration = duration;
        // 显示时长
        this.renderDuration();
        // 显示加载进度
        var p = Math.round(percent * 100);
        this.renderLoaded(p);
        if (p >= 100) {
            this.changeState('canplay');
            if (this.options.autoPlay) {
                this.play();
            }
        }
    };
    proto.updatePlayhead = function (percent) {
        this.renderCurrentProgress(percent);
    };
    proto.loadError = function () {
        this.handleError();
        // LOG('[Flash] error');
    };
    proto.trackEnded = function () {
        this.handleEnded();
    };
    proto.load = function () {
        LOG('[Flash] load');
    };

    // get the HTML Element
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