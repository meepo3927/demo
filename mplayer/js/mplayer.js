/**
 * @描述  音乐播放器, 依赖jQuery
 * @用法  new MPlayer(elem, options);
 * options = {
 *     src: 'xxx/1.mp3'
 * }
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
    var getHolderHtml = function () {
        return [
            '<div class="play-pause">',
                '<p class="play"></p>',
                '<p class="pause"></p>',
                '<p class="loading"></p>',
                '<p class="error"></p>',
            '</div>',
            '<div class="scrubber">',
                '<div class="progress"></div>',
                '<div class="loaded"></div>',
            '</div>',
            '<div class="time">',
                '<em class="played">00:00</em>',
                '/',
                '<strong class="duration">00:00</strong>',
            '</div>',
            '<div class="error-message"></div>'
        ].join('');
    };
    var getAudioHtml = function (options) {
        var src = options.src || '';
        if (HTML5Supported) {
            return [
                '<audio preload="auto" src="' + src + '" ></audio>'
            ].join('');
        }
    };

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
    proto.load = function (url) {
        this.audio.setAttribute('src', url);
    };
    proto.init = function () {
        this.$elem.addClass(holderClassName);
        this.$elem.html(
            getAudioHtml(this.options) + 
            getHolderHtml()
        );
        // define children 
        this.$error = this.$elem.children('.error-message');
        this.audio = this.$elem.children('audio')[0];
        if (this.audio) {
            this.bindHTML5();
        }
    };
    proto.bindHTML5 = function () {
        this.audio.addEventListener('error', this);
    };
    proto.handleError = function (e) {
        this.$elem.addClass('error');
        this.$error.html('加载失败: ' + this.options.src);
    };
    proto.handleEvent = function (e) {
        var eventName = 'handle-' + e.type.toLowerCase();
        var type = e.type.charAt(0).toUpperCase() + e.type.substr(1);
        var methodsName = 'handle' + type;
        if (typeof this[methodsName] === 'function') {
            this[methodsName](e);
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
            let elem = document.getElementById(el);
            if (elem) {
                return $(elem);
            }
            return $(el);
        }
        return $(el);
    };
    
    return Player;
}));