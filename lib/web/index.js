'use strict';

var express = require('express');
var bodyParser = require('body-parser');

module.exports = function (setup) {

  var app = express();

  setup(app);

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded());

  app.get('/rest/v1/status', function (req, res) {
    res.status(200).send({status: 'ok'});
  });

  return app;
};