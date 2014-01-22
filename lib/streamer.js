var errors     = require('./errors'),
    Subscriber = require('./subscriber'),
    AMQP       = require('./eventsource/amqp');

function Middleware(es, options, req, res, next) {
  var subscriber = new Subscriber(es, options, req, res);

  if(!subscriber.valid) return;

  es.connect()
    .then(subscriber.openStream.bind(subscriber))
    .then(es.bindSubscriber.bind(es, subscriber));
}

function Streamer(options) {
  console.log('[TownCrier] Middleware initialized');

  var EventSource = new AMQP(options.amqp, options.connection);

  EventSource.connect();

  return Middleware.bind(this, EventSource, options);
}

module.exports = Streamer;