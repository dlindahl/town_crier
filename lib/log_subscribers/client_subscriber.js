var client = exports = module.exports = {};

client.streamopen = function() {
  this.logger.log('Stream open');
};

client.streamwrite = function(client, output) {
  this.logger.log('Wrote to stream:', output.join(', '));
};

client.streamclose = function(client, status, reason) {
  this.logger.log('Stream closed:', status, reason);
};

client.disconnect = function(client, status, reason) {
  this.logger.log('Disconnected');
};