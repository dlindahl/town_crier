/* jshint node:true, strict:false */
var client = require('./client');
var ES = require('./event_source');
var Logger = require('./logger');
var TC = require('./consts');

function Streamer(options) {
  var logger = Logger(options.logger);

  logger.log('Middleware', 'v'+TC.version, 'initialized');

  var provider = options.provider;
  var esProvider = ES(provider.name)(provider, logger);
  var openProvider = esProvider.connect();

  return function Middleware(req, res, next) {
    var c = client(options, req, res, next, logger);

    openProvider
      .then(c.subscribeAll.bind(c))
      .tap(c.connect)
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