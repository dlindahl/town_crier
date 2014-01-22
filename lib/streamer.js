var errors = require('./errors'),
    Client = require('./client'),
    AMQP   = require('./eventsource/amqp');

function Middleware(es, options, req, res, next) {
  var client = new Client(es, options, req, res);

  if(!client.valid) return;

  es.connect()
    .then(client.openStream.bind(client))
    .then(es.bindSubscriber.bind(es, client));
}

function Streamer(options) {
  console.log('[TownCrier] Middleware initialized');

  var EventSource = new AMQP(options.amqp, options.connection);

  EventSource.connect();

  return Middleware.bind(this, EventSource, options);
}

module.exports = Streamer;