var amqp = require('amqp'),
    when = require('when');

function onReady(connection, deferred) {
  return function() {
    console.log('Town Crier ready for streaming...');

    deferred.resolve(connection);
  };
}

module.exports = function eventsource() {
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
  connection.once('ready', onReady(connection, deferred));

  return deferred.promise;
}();