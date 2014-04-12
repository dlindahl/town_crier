/* jshint node:true, strict:false */
var extend = require('node.extend');
var path = require('path');
var basename = path.basename;
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var logSubscriber = require('./log_subscriber');

exports = module.exports = createEventSource;

function createEventSource(providerName) {
  var provider = exports.providers[providerName];

  function EventSource(providerCfg, logger) {
    this.providerCfg = providerCfg;
    this.name = provider.name;
    this.logger = logger;

    logSubscriber('amqp').attachTo(this);
  }

  extend(EventSource.prototype, exports.providers.noop);
  extend(EventSource.prototype, provider);
  extend(EventSource.prototype, EventEmitter.prototype);

  return function EventSourceCreator(providerCfg, logger) {
    return new EventSource(providerCfg, logger);
  };
}

/**
 * Auto-load provider getters.
 */

exports.providers = {};

fs.readdirSync(__dirname + '/providers').forEach(function(filename){
  if (!/\.js$/.test(filename)) return;
  var name = basename(filename, '.js');
  function providerLoader(){ return require('./providers/' + name); }
  exports.providers.__defineGetter__(name, providerLoader);
  exports.__defineGetter__(name, providerLoader);
});