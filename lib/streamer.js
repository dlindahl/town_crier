// TODO: Make configuration at the Middleware level
var Subscriber = require('./subscriber'),
    EventSource = new(require('./eventsource/amqp'))({
      host:      process.env.AMQP_HOST,
      login:     process.env.AMQP_USERNAME,
      password:  process.env.AMQP_PASSWORD,
      port:      5672,
      ssl:       { enabled : false },
      vhost:     '/',
      authMechanism: 'AMQPLAIN'
    },{
      reconnect: false
    });

function onEventSourceError(subscriber) {
  return function(err) {
    subscriber.logger('error', 'Event Source failed to connect.', err);
    subscriber.res.send(500, 'Server Error');
    subscriber.res.end();
  };
}

module.exports = function(options) {
  console.log('Town Crier middleware initialized');
  return function streamer(req, res, next) {
    var subscriber = new Subscriber(req, res, options);

    if( !EventSource.validateSubscriber(subscriber) ) {
      subscriber.res.send(403, 'Forbidden');
      subscriber.res.end();
    }

    EventSource.connect()
      .then(
        EventSource.bindSubscriber(subscriber).bind(EventSource),
        onEventSourceError(subscriber)
      );
  };
};