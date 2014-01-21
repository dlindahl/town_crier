function LogSubscriber(logger) {
  this.logger = logger || console;
}

function attachTo(obj) {
  var subscriber = this;
  Object.keys(Object.getPrototypeOf(this)).forEach(function(k) {
    obj.on(k, subscriber[k].bind(subscriber));
  });
}

LogSubscriber.prototype.attachTo = attachTo;

module.exports = LogSubscriber;