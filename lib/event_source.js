var extend   = require('node.extend'),
    path     = require('path'),
    basename = path.basename,
    fs       = require('fs');

exports = module.exports = createEventSource;

function createEventSource(providerName) {
  var provider = exports.providers[providerName];

  function EventSource(options) {
    this.options = options;
  }

  extend(EventSource.prototype, exports.providers.noop);
  extend(EventSource.prototype, provider);

  return function EventSourceCreator(options) {
    return new EventSource(options);
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