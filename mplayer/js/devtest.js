window.LOG = function () {
    if (window.console && window.console.log) {
        var len = arguments.length;
        for (var i = 0; i < len; i++) {
            window.console.log(arguments[i]);
        }
    }
};

window.Rand = function () {
    return parseInt(Math.random() * 9999999, 10);
};

window.UID = (function () {
    var id = 0;
    return function () {
        return ++id;
    };
})();