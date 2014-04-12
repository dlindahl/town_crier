/* jshint node:true, strict:false */
var when = require('when');

exports = module.exports = {
  declareForUser : declareForUser,
  bindToFanout : bindToFanout
};

var queueOpts = {
  autoDelete : true,
  durable : false,
  closeChannelOnUnsubscribe : true
};

// Since we are only declaring one queue per unique User, messages that match
// multiple routing keys will only be delivered once.
function declareForUser(conn, provider, name) {
  var dfd = when.defer();

  conn.queue(name, queueOpts, dfd.resolve, dfd.reject);

  provider.emit('userqueuedeclaration', provider, name);

  return dfd.promise;
}

function bindToFanout(provider, routingKey) {
  return function bindToFanout(results) {
    var fanout = results[1];
    var queue = results[2];
    var dfd = when.defer();

    queue.bind(fanout, routingKey);
    queue.subscribe().addCallback(dfd.resolve, dfd.reject);

    provider.emit('queuefanoutbind', provider, queue, fanout, routingKey);

    return dfd.promise;
  };
}