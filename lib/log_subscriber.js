var extend   = require('node.extend'),
    path     = require('path'),
    basename = path.basename,
    fs       = require('fs'),
    Logger   = require('./logger');

exports = module.exports = createLogSubscriber;

var proto = {};

function createLogSubscriber(logSubscriberName, options) {
  var subscriber = exports.log_subscribers[logSubscriberName];

  options = (options || {});

  function LogSubscriber() {
    this._logger = options.logger;
  }

  extend(LogSubscriber.prototype, proto);
  extend(LogSubscriber.prototype, subscriber);

  return new LogSubscriber();
}

proto.attachTo = function attachTo(obj) {
  var logSubscriber = this;

  this.__defineGetter__('logger', function() {
    if(this._logger) return this._logger;

    return obj.logger || (this._logger = new Logger());
  });


  Object.keys(Object.getPrototypeOf(this)).forEach(function(k) {
    if(proto[k]) return;
    obj.on(k, logSubscriber[k].bind(logSubscriber));
  });
};

/**
 * Auto-load log_subscriber getters.
 */

exports.log_subscribers = {};

fs.readdirSync(__dirname + '/log_subscribers').forEach(function(filename){
  if (!/\.js$/.test(filename)) return;
  var name = basename(filename, '.js');
  function logSubscriberLoader(){ return require('./log_subscribers/' + name); }
  var getterName = name.replace('_subscriber', '');
  exports.log_subscribers.__defineGetter__(getterName, logSubscriberLoader);
  exports.__defineGetter__(getterName, logSubscriberLoader);
});
