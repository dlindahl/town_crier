function Logger(prefix) {
  this.prefix = prefix || '';
}

Object.keys(Object.getPrototypeOf(global.console)).forEach(function(key) {
  Logger.prototype[key] = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.prefix);
    global.console[key].apply(global, args);
  };
});

module.exports = Logger;