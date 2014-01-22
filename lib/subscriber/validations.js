function validate(subscriber) {
  var valid = true,
      exchanges = subscriber.req.query.exchanges;

  exchanges.forEach(function(exchange) {
    if( !exchange || exchange === '' || exchange.match(/^amq\./) ) {
      subscriber.emit('invalid', subscriber);
      valid = false;
    }
  });

  return valid;
}

function Validations() {
  this.valid = false;
  this.valid = validate(this);
}

module.exports = Validations;