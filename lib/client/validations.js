function validate(client) {
  var valid = true,
      exchanges = client.req.query.exchanges;

  exchanges.forEach(function(exchange) {
    if( !exchange || exchange === '' || exchange.match(/^amq\./) ) {
      client.emit('invalid', client);
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