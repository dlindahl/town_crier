var Logger = require('./logger');

function LogSubscriber(logger) {
  this.logger = logger || new Logger('[TownCrier]');
}

function attachTo(obj) {
  var subscriber = this;
  Object.keys(Object.getPrototypeOf(this)).forEach(function(k) {
    obj.on(k, subscriber[k].bind(subscriber));
  });
}

LogSubscriber.prototype.attachTo = attachTo;

module.exports = LogSubscriber;