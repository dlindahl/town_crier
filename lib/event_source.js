var extend        = require('node.extend'),
    path          = require('path'),
    basename      = path.basename,
    fs            = require('fs'),
    EventEmitter  = require('events').EventEmitter,
    logSubscriber = require('./log_subscriber');

exports = module.exports = createEventSource;

function createEventSource(providerName) {
  var provider = exports.providers[providerName];

  function EventSource(options, logger) {
    this.options = options;
    this.name    = provider.name;
    this.logger  = logger;

    logSubscriber('amqp').attachTo(this);
  }

  extend(EventSource.prototype, exports.providers.noop);
  extend(EventSource.prototype, provider);
  extend(EventSource.prototype, EventEmitter.prototype);

  return function EventSourceCreator(options, logger) {
    return new EventSource(options, logger);
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