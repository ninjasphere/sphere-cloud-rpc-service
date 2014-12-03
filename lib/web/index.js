'use strict';

var express = require('express');

module.exports = function(parent, app) {
  var router = express.Router();

  router.get('/status', function(req, res) {
  	res.status(200).send({status: 'ok'});
  });

  parent.use('/rest/v1', router);
}