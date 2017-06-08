/**
 * @描述  音乐播放器
 * @用法  new MPlayer(elem, options);
 * options = {
 *     
 * }
 */

(function (name, factory) {
    if (typeof define === 'function' && (define.amd || define.cmd)) {
        define([], factory);
    } else {
        window[name] = factory();
    }
}('MPlayer', function () {
    "use strict";
    function Player(elem, options) {
        options = options || {};

        this.options = options;
    }

    var proto = Player.prototype;

    
    
    return Player;
}));