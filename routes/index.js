var express = require('express');
var authverification  =   require('../middleware/auth');
var router = express.Router();
/* GET home page. */
router.get('/',function(req, res, next) {
  res.send({ title: 'Express' });
});
router.get('/protected',authverification,function(req, res, next) {
  res.send( {title: 'Protected' });
});

module.exports = router;
