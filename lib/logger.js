/* jshint node:true, strict:false */
var extend = require('node.extend');
var TC = require('./consts');

exports = module.exports = createLogger;

function createLogger(origLogger) {
  origLogger = origLogger || global.console;
  function logger() {
    this.prefix = TC.loggerPrefix;
  }

  var proto = {};
  Object.keys(Object.getPrototypeOf(origLogger)).forEach(function(key) {
    proto[key] = function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('['+this.prefix+']');
      origLogger[key].apply(origLogger, args);
    };
  });
  extend(logger.prototype, proto);
  return new logger();
}
