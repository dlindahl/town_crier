var when = require('when');

exports = module.exports = {
  declareExchange : declareExchange,
  bindToExchange : bindToExchange
};

// TODO: Make configurable via provider opts hash
// TODO: Move fanout stuff to sep module
var fanoutOpts = {
  type       : 'fanout',
  durable    : false,
  autoDelete : true
};

function declareExchange(conn, provider, name) {
  var dfd = when.defer();

  conn.exchange(name, fanoutOpts, dfd.resolve, dfd.reject);

  provider.emit('fanoutdeclaration', provider, name);

  return dfd.promise;
}

function bindToExchange(provider, exchange, routingKey) {
 return function bindToExchange(fanout) {
    var dfd = when.defer();

    fanout.bind(exchange, routingKey, dfd.resolve, dfd.reject);

    provider.emit('fanoutbind', provider, exchange, routingKey, fanout);

    return dfd.promise;
  };
}