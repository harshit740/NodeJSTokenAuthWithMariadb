var express = require('express');
const mariadb = require('mariadb');
var jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
var register = require('./register.js');
var router = express.Router();
const pool = mariadb.createPool({host: '127.0.0.1',port:'3306',user:'root',password:'123' ,connectionLimit: 2,database:'student'});
/**qury excution*/
async function qury(query,callback) {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(query);
        callback(rows)
    } catch (err) {
        callback(err)
    } finally {
        if (conn) return conn.end();
    }
}
/* GET users listing. */
router.post('/', function(req, res, next) {
   var mobileno = req.body.mobileno
   var password = req.body.password
    query = "SELECT * FROM `users` where mobileno ="+mobileno+";";
    qury(query,function (data) {
        console.log(data)
        checkUser(password,data[0].password,data[0],function (data) {
        res.send(data).status(data.status)
        })

    })
});
module.exports = router;
async function checkUser(sentpassword, dbpasssword,data,callback) {

    const match = await bcrypt.compare(sentpassword, dbpasssword);
    console.log(match)
    if (match) {
        if (data.is_activte === 1){
            var token = jwt.sign(data, 'password');
            callback(token)
        }
        else {
            register.resendOtp(data.mobileno,function (response) {
                console.log(response)
               callback(response)
            })
        }
    }
    else {
        data = {massage:"invalid Credential Username Or password iS wrong",status:403}
        callback(data)
    }
}
