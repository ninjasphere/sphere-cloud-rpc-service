var debug = require('debug')('mqtt-service:rpc');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var Joi = require('joi');
var schemas = require('./schemas');

function MQTTServiceFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(MQTTServiceFacet, EventEmitter);

MQTTServiceFacet.prototype.initialise = function() {
  return this.service.facets('amqp').spread(function(amqp) {
  	this.amqp = amqp;
    debug('got dependency', amqp.name);
  }.bind(this));
};

MQTTServiceFacet.prototype.rpc_methods = {};

var mqtt = {};
mqtt.publishToTopic = function(user, topic, payload) {
  Joi.assert(user, schemas.UserRecord);
  Joi.assert(topic, schemas.MQTTTopic);
  Joi.assert(payload, schemas.MQTTPayload);

  var userId = user.id;
  var routingKey = userId + '.' + topic.replace(/\//g, '.');

  this.amqp.publish('amq.topic', routingKey, new Buffer(payload));

  debug('Publishing to routing key', routingKey, 'payload', payload);

  return { success: true };
};

MQTTServiceFacet.prototype.rpc_methods.mqtt = mqtt;

module.exports = MQTTServiceFacet;
