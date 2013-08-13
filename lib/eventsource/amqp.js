var amqp = require('amqp'),
    when = require('when');

function bindToExchange(e2e, name, routing_key) {
  var deferred = when.defer();

  try {
    e2e.bind(name, routing_key, function() {
      console.log('Bound Town Crier to "' + name + '" exchange (Routing Key: "' + routing_key + '")');
      deferred.resolve(e2e);
    });
  } catch(err) {
    console.error('Failed to bind Town Crier to "' + name + '" exchange (Routing Key: "' + routing_key + '")');
    console.error(err);
    deferred.reject(err);
  }

  return deferred.promise;
}

function bindToExchanges(e2e, exchanges, deferred) {
  var name = exchanges.shift();

  deferred = deferred || when.defer();

  bindToExchange(e2e, name, '#').then(function() {
    if(exchanges.length > 0) {
      bindToExchanges(e2e, exchanges, deferred);
    } else {
      deferred.resolve(e2e);
    }
  }, function(err) {
    bindToExchanges(e2e, exchanges, deferred);
  });

  return deferred.promise;
}

function onE2E(options, connection, deferred) {
  return function(e2e) {
    console.log('Town Crier E2E Exchange opened, binding to exchanges');

    bindToExchanges(e2e, options.exchanges).then(function(e2e) {
      console.log('Town Crier ready for streaming...');
      deferred.resolve({ connection:connection, e2e:e2e });
    }, function(err) {
      deferred.reject(err);
    });
  };
}

function onReady(options, connection, deferred) {
  return function() {
    var opts = {
          autoDelete : true
        };

    this.exchange(exchangeName(), opts, onE2E(options, connection, deferred));
  };
}

function exchangeName() {
  return 'town_crier-' + process.env.NODE_ENV + '-e2e';
}

module.exports = function eventsource(options) {
  var deferred = when.defer(),
      connection = amqp.createConnection({
        host:      process.env.AMQP_HOST,
        login:     process.env.AMQP_USERNAME,
        password:  process.env.AMQP_PASSWORD,
        port:      5672,
        ssl:       { enabled : false },
        vhost:     '/',
        authMechanism: 'AMQPLAIN'
      });

  connection.once('error', deferred.reject);
  connection.once('ready', onReady(options, connection, deferred));

  return deferred.promise;
};