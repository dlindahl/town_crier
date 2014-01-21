var errors     = require('./errors'),
    Subscriber = require('./subscriber'),
    AMQP       = require('./eventsource/amqp');

function onEventSourceError(subscriber) {
  return function(err) {
    subscriber.logger('error', 'Event Source failed to connect.', err);
    subscriber.res.send(500, 'Server Error');
    subscriber.res.end();
  };
}

function validateConfig(cfg) {
  Object.keys(cfg).forEach(function(key) {
    if('undefined' === cfg[key] || cfg[key] === '') {
      throw new errors.InvalidConfiguration(key + ' cannot be blank');
    }
  });
}

module.exports = function Streamer(options) {
  console.log('Town Crier middleware initialized');
  var EventSource = new AMQP(options.amqp, options.connection);

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