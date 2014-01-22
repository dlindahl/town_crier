function validate(client) {
  var valid = true,
      exchanges = client.req.query.exchanges;

  exchanges.forEach(function(exchange) {
    if( !exchange || exchange === '' || exchange.match(/^amq\./) ) {
      client.logger.error('Event Source rejected. Invalid parameters', client.req.params, client.req.query);
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