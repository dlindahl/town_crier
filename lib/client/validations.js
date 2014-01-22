function validate(client) {
  var valid = true,
      exchanges = client.req.query.exchanges;

  exchanges.forEach(function(exchange) {
    if( !exchange || exchange === '') {
      client.emit('invalid', client, 'Exchange cannot be blank');
      valid = false;
    } else if(exchange.match(/^amq\./)) {
      client.emit('invalid', client, exchange + ' is a private AMQP exchange');
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