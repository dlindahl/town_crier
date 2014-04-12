/* jshint node:true, strict:false */
var client;
client = exports = module.exports = {};

client.streamopen = function() {
  this.logger.log('Stream open');
};

client.streamwrite = function(client, output) {
  var o = output.join(', ');
  if(o[0] === ':') return; // Skip comment packets
  this.logger.log('Wrote to stream:', o);
};

client.streamclose = function(client, status, reason) {
  this.logger.log('Stream closed:', status, reason);
};

client.disconnect = function(/*client, status, reason*/) {
  this.logger.log('Disconnected');
};