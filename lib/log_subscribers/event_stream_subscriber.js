var util = require('util'),
    extend = require('node.extend'),
    LogSubscriber = require('../log_subscriber');

function EventStreamSubscriber() {
  LogSubscriber.apply(this, arguments);
}
util.inherits(EventStreamSubscriber, LogSubscriber);

function connectionEnd(stream) {
  this.logger.log('Event Source ended');
}

function connectionClose(stream) {
  this.logger.log('Event Source closed');
}

extend(EventStreamSubscriber.prototype, {
  connectionEnd   : connectionEnd,
  connectionClose : connectionClose
});

module.exports = EventStreamSubscriber;