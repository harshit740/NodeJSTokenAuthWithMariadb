var express = require('express');
var router = express.Router();
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const https = require('https');
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
//select user by id
function  getuser(id,callback){
    var query = "SELECT * FROM `users` where id ="+id+";";
    console.log(query)
    qury(query,function (data) {
        console.log(data)
       callback(data)
    })
}
//send httprequest for otp
var OtpAPI = function(options,callback){
    var req = https.get(options, function (res) {
        var responseString = "";
        res.on("data", function (data) {
            responseString += data;
        });
        res.on("end", function () {
            callback(JSON.parse(responseString))
        });
    });
    console.log(req)
}
//geting otp from database
function getotp(id,callback){
    var query = "SELECT * FROM `otp_verificatin` where id ="+id+";";
    console.log(query)
    qury(query,function (data) {
        console.log(data)
        callback(data)
    })
}
/* GET users listing. */
router.post('/',  function(req, res) {
    var data = req.body
    //checkfor error
    if (!data.hasOwnProperty('first_name')) {
        res.status(404).send('No name provided');
    }
    if (!data.hasOwnProperty('last_name')) {
        res.status(404).send('No last_name provided');
    }
    if (!data.hasOwnProperty('mobileno')) {
        res.status(404).send ('No email provided');
    }
    if (!data.hasOwnProperty('password')) {
        res.status(404).send('No password provided');
    }
    //Query bana rha ruk ja
    bcrypt.hash( data.password, 2, function(err, hash) {
        var query = "INSERT INTO `users` "+"(`first_name`,`last_name`,`mobileno`,`password`,`is_activte`,`is_disabled`)"+ " VALUES "+ "('"+ data.first_name +"','"+ data.last_name+"','"+ data.mobileno+"','"+ hash+"',FALSE,FALSE);";
        qury(query,function (instenceid) {
           console.log(instenceid)
            if (typeof instenceid.errno !== 'undefined')
            {
                if (instenceid.errno === 1062)
                    res.send({massage:'Mobile NO already Exist Please Login With your User ID and password'})
                     return
            }
            const options = {
                hostname: '2factor.in',
                path: '/API/V1/b59d586e-8ba3-11e9-ade6-0200cd936042/SMS/'+data.mobileno+'/AUTOGEN',
                method: 'POST'
            }
            OtpAPI(options,function(params) {
                console.log(params.Status);
                if (params.Status === "Success")
                {
                    console.log(params.Status);
                    var query = "INSERT INTO  `otp_verificatin` (`session`, `user_id`, `mobileno`,)"+ " VALUES "+ "('"+ params.Details +"',"+ instenceid.insertId+",'"+ data.mobileno +"');";
                    console.log(query)
                    qury(query,function (data) {
                        data = {otpid:data.insertId}
                        res.status(200).send(data)
                    })
                }
            })
        })
    });
});
router.post('/verifyOtp',function (req,res) {
    if (req.body.otp.lenght < 6 && req.body.otp.lenght > 6) {
        res.send({massage:"Wrong OTP"})
    } else {
        verifyOtp(req.body.otpid,req.body.otp,function (param) {
            console.log(param)
            res.status(param.status).send(param)
        })
    }

function verifyOtp(otpid,otp,callback) {
    getotp(otpid,function (otpData) {
        const options = {
            hostname: '2factor.in',
            path: '/API/V1/b59d586e-8ba3-11e9-ade6-0200cd936042/SMS/VERIFY/'+otpData[0].session+'/'+otp,
            method: 'POST'
        }
        OtpAPI(options,function(params) {
            if (params.Status === 'Success')
            {
                const  query = "UPDATE `users` SET `is_activte` = 1 where id ="+otpData[0].user_id+";";
                qury(query,function (data) {
                   if (data.warningStatus === 0)
                   {
                       data = {massage:"Account Activated Sucssefully Please Loginto YOur Account",status:200}
                       callback(data)
                   }
                   else {
                       data = {massage:"error while activating your account",status:404}
                       callback(data)
                   }
                })
            }
            else {
                data = {massage:"OTP Dose Not match",status:404}
                callback(data)
            }
        })
    })

}
})

function resendOtp(mobileno,callback){
//otp count will be implemented
    const options = {
        hostname: '2factor.in',
        path: '/API/V1/b59d586e-8ba3-11e9-ade6-0200cd936042/SMS/'+mobileno+'/AUTOGEN',
        method: 'POST'
    }
    OtpAPI(options,function(params) {
        console.log(params.Status);
        if (params.Status === "Success")
        {
            console.log(params.Status);
            var query = "Update `otp_verificatin` SET `session` = '"+params.Details +"'  where mobileno = '"+ mobileno+"' ;";
            qury(query,function (data) {
                var query = "SELECT * FROM `otp_verificatin` where mobileno = '"+ mobileno+"' ;";
                qury(query,function (data) {
                    console.log(data)
                    data = {otpid:data[0].id};
                    console.log(data);
                    callback(data);
                })
            })
        }
    })
}

module.exports = {
    router,
    resendOtp
};
