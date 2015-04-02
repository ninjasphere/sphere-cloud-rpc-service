"use strict";

var usvc = require('usvc');

var debug = require('debug')('test:cloud-rpc');

var expect = require('chai').expect;

describe('cloud rpc', function () {

  var service = usvc.microService({
    // bus connections
    amqp: usvc.facets.msg.amqp(),

    // and the opposite direction: internal RPC -> amqp/mqtt
    rpcService: usvc.facets.rpc.jsonServer(['mqttService']),
    mqttService: require('../lib/rpc/mqtt')

  });

  before(function () {
    service.run();
  });

  it('should process an rpc');

});