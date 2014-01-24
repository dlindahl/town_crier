var errors = require('./errors'),
    client = require('./client'),
    ES     = require('./event_source'),
    Logger = require('./logger');

function Streamer(options) {
  var logger = Logger(options.logger);

  logger.log('Middleware initialized');

  var provider     = options.provider,
      esProvider   = ES(provider)(options);
      openProvider = esProvider.connect();

  return function Middleware(req, res, next) {
    var c = client(options, req, res, next, logger);

    openProvider
      .then(c.subscribeAll.bind(c))
      .tap(c.openStream)
      .catch(c.disconnect)
      .catch(function errorHandler(err) {
        // Catch any errors that occurred during disconnection
        logger.error(err);

        // node-amqp does not currently have reliable reconnect logic, so just
        // kill the process, dumping all socket connections in the process, and
        // allow monit, etc. to restart the application.
        process.exit(1);
      });
  };
}

module.exports = Streamer;