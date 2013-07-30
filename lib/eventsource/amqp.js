var amqp = require('amqp'),
    when = require('when');

module.exports = function eventsource() {
  var deferred = when.defer(),
      connection = amqp.createConnection({
        host:      process.env.AMQP_HOST,     // TODO: Make these more configurable
        login:     process.env.AMQP_USERNAME,
        password:  process.env.AMQP_PASSWORD,
        port:      5672,
        ssl:       { enabled : false },
        vhost:     '/',
        authMechanism: 'AMQPLAIN'
      });

  connection.on('error', deferred.reject);
  connection.on('ready', function() {
    deferred.resolve(connection);
  });

  return deferred.promise;
}();