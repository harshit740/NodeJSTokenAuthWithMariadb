
var jwt = require('jsonwebtoken');

module.exports = function(req,res,next) {
var token = req.headers.authorization
console.log(token)
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, 'password', function(err, decoded) {       if (err) {
            return res.json({ success: false, message: 'Failed to authenticate token.' });       } else {
            // if everything is good, save to request for use in other routes
            console.log(decoded)
            req.user = decoded;
            next();
        }
        });

    } else {

        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });

    }

};
