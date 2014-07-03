var debug = require('debug')('notification:rpc');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var whennode = require('when/node');

function UserNotificationServiceFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(UserNotificationServiceFacet, EventEmitter);

UserNotificationServiceFacet.prototype.initialise = function() {

};

UserNotificationServiceFacet.prototype.getUserspaceRPCMethods = function(rpcBroker) {
  rpcBroker.register('notification.subscribe', this._subscribeRPC.bind(this));
  rpcBroker.register('notification.unsubscribe', this._unsubscribeRPC.bind(this));
};

UserNotificationServiceFacet.prototype._subscribeRPC = function(callData) {
  debug('subscribe', 'got rpc for user', callData.userId);
};

UserNotificationServiceFacet.prototype._unsubscribeRPC = function(callData) {
  debug('unsubscribe', 'got rpc for user', callData.userId);
};

module.exports = UserNotificationServiceFacet;
