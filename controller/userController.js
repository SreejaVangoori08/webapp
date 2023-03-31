const db = require('../model')
const bcrypt = require("bcrypt");
const { user } = require('../model');

const User = db.user
const winston = require("winston");
const statsd = require("node-statsd");
const statsdClient=new statsd(
  {host: 'localhost',
  port: 8125}
)

const path = require('path');

const logsFolder = path.join(__dirname, '../logs');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logsFolder, 'csye6225.log') })
  ]
});

let isEmail = (email) => {
    var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (email.match(emailFormat)) {
        return true;
    }
    return false;
};

//Password Regex : min 8 letter password, with at least a symbol, upper and lower case letters and a number
let checkPassword = (str) => {
    var passRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
    console.log(str)
    return str.match(passRegex);
};

//Name Validation
let checkName = (str) => {
    var regName = /^[a-zA-Z]+$/;
    return str != "" && str.match(regName);
};

let encryptedPassword = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

const adduser = async (req, res) => {
    statsdClient.increment('POST.adduser.count');
    logger.log('info','Started adduser endpoint');
    const allowedParams = ["first_name", "last_name", "password", "username"];
    const receivedParams = Object.keys(req.body);
    const unwantedParams = receivedParams.filter(
        (param) => !allowedParams.includes(param)
    );
    const notReceivedParams = allowedParams.filter((param) =>
        !receivedParams.includes(param)
    );
    console.log(notReceivedParams);
    console.log(allowedParams);
    console.log(unwantedParams);
    console.log(receivedParams);
    if (unwantedParams.length) {
        res
            .status(400)
            .send({
                error: `The following parameters are not allowed: ${unwantedParams.join(
                    ", "
                )}`,
            });
    }
    else if (notReceivedParams.length) {
        res
            .status(400)
            .send({
                error: `The following required parameters are not received: ${notReceivedParams.join(
                    ", "
                )}`,
            });
    }
    else {
        const firstName = req.body.first_name;
        const lastName = req.body.last_name;
        const username = req.body.username;
        const password = req.body.password;

        if (firstName == null) {

            res.status(400).send("Please enter firstname");
        }
        else if (lastName == null) {

            res.status(400).send("Please enter lastname");
        }
        else if (username == null) {

            res.status(400).send("Please enter email");
            logger.log('warn','no email error adduser endpoint');
        }
        else if (password == null) {

            res.status(400).send("Please enter Password");
        }
        else if (!isEmail(username)) res.status(400).send("Please enter valid email");
        else if (!checkPassword(password))
            res.status(400).send("Please enter valid password");
        else if (!(checkName(firstName) && checkName(lastName)))
            res.status(400).send("Please enter valid First and Last Names");
        else {
            const hashedPassword = encryptedPassword(password);
            let suser = await User.findOne({ where: { username: username } })
            if (!suser) {
                let info = {
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    username: req.body.username,
                    password: hashedPassword
                }

                const user = await User.create(info)
                // res.send(user)
                //res.status(200)
                let s1user = await User.findOne({ where: { username: username } })
                res.status(201).send(
                    {
                        "id": s1user.id,
                        "firstname": s1user.first_name,
                        "lastname": s1user.last_name,
                        "username": s1user.username,
                        "account_created": s1user.account_created,
                        "account_updated": s1user.account_updated
                    }
                );
                logger.log('info','user created adduser endpoint');

            }
            else {
                res.status(400).send("username already exists");
               
                logger.log('warn','username already exists adduser endpoint');
            }

        }
    }

}

const getuser = async (req, res) => {
    statsdClient.increment('GET.getuser.count');
    logger.log('info','Started getuser endpoint');
    const userId = req.params.userId;
    let authheader = req.headers.authorization;
    if (!authheader) {

        res.status(401).send("basic authentication not present");
        logger.log('error','basicAuth not present adduser endpoint');

    }
    else {

        var auth = new Buffer.from(authheader.split(" ")[1], "base64")
            .toString()
            .split(":");
        var username = auth[0];
        var password = auth[1];
        if (!isEmail(username)) res.status(401).send("Bad request - Enter Valid email");
        else {
            let suser = await User.findOne({ where: { username: username } })
            if (suser == null) {
                console.log("------> User Not Found");
                res.status("User not found").sendStatus(401);
                logger.log('error','User not found getuser endpoint');
            }

            else {
                bcrypt.compare(password, suser.password, (err, resu) => {
                    if (err) throw err;
                    console.log(resu);
                    if (resu && userId == suser.id) {
                        console.log("Authentication Successful");
                        console.log(resu);
                        res.status(200).send({
                            id: suser.id,
                            first_name: suser.first_name,
                            last_name: suser.last_name,
                            username: suser.username,
                            account_created: suser.account_created,
                            account_updated: suser.account_updated
                        });
                        logger.log('info','get product success adduser endpoint');
                    }
                    else {
                       
                        res.status(401).send("Forbidden");
                        logger.log('error','Authentication Failed getuser endpoint');
                    }
                });
            }

        }
    }
}

const updateuser = async (req, res) => {
    statsdClient.increment('UPDATE.updateuser.count');
    logger.log('info','Started updateuser endpoint');
    const allowedParams = ["first_name", "last_name", "password"];
    const receivedParams = Object.keys(req.body);
    const unwantedParams = receivedParams.filter(
        (param) => !allowedParams.includes(param)
    );
    // const notReceivedParams = allowedParams.filter((param) =>
    //     !receivedParams.includes(param)
    // );
    // console.log(notReceivedParams);
    console.log(allowedParams);
    console.log(unwantedParams);
    console.log(receivedParams);
    if (unwantedParams.length) {
        res
            .status(400)
            .send({
                error: `The following parameters are not allowed: ${unwantedParams.join(
                    ", "
                )}`,
            });
    }
    // else if (notReceivedParams.length) {
    //     res
    //         .status(400)
    //         .send({
    //             error: `The following required parameters are not received: ${notReceivedParams.join(
    //                 ", "
    //             )}`,
    //         });
    // }
    else {
        let userId = req.params.userId
        console.log("userid:" + userId);
        var firstName = req.body.first_name;
        var lastName = req.body.last_name;
        var passwordBody = req.body.password;
        var hashedPassword;

        let authheader = req.headers.authorization;
        if (!authheader) {
            res.status(400).send("basic authentication not present");
            logger.log('error','BasicAuth not present updateuser endpoint');
        }
        else {
            var auth = new Buffer.from(authheader.split(" ")[1], "base64")
                .toString()
                .split(":");
            var username = auth[0];
            var password = auth[1];
            if (!isEmail(username)) { res.status(401).send("Bad request - Enter Valid email"); }
            else {
                let suser =  await User.findOne({ where: { username: username } })
                if (suser == null) {
                    console.log("->User not found");
                    res.status(401).send("Authentication failed");
                    logger.log('error','Authentication failed updateuser endpoint');
                }

                else {
                    bcrypt.compare(password, suser.password, (err, resu) => {
                        if (err) throw err;
                        if (firstName == null || firstName == "")
                            firstName = suser.first_name;
                        if (lastName == null || lastName == "")
                            lastName = suser.last_name;
                        if (passwordBody == null || passwordBody == "") {
                            hashedPassword = suser.password;
                        }
                        else {
                            var hashedPassword = encryptedPassword(req.body.password);
                        }
                        if (resu && userId == suser.id) {
                            console.log("Authentication Successful");
                            let upinfo = {
                                first_name: firstName,
                                last_name: lastName,
                                password: hashedPassword
                            }
                            if (
                                passwordBody != null &&
                                passwordBody != "" &&
                                !checkPassword(passwordBody)
                            )
                                res.status(400).send("Please enter valid password");
                            else if (!(checkName(firstName) && checkName(lastName)))
                                res.status(400).send("Please enter valid First and Last Names");
                            else {
                                const user = User.update(upinfo, { where: { id: userId } })
                                res.status(204).send(user)
                                logger.log('info','User update Successful updateuser endpoint');
                            }
                        }
                        else {
                            res.status(403).send("Forbidden");
                            logger.log('warn','Authorization Failed updateuser endpoint');
                        }



                    });
                }


            }
        }
    }


}

module.exports = {
    adduser,
    updateuser,
    getuser,
    isEmail
}