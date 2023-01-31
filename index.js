const express = require("express");
const bcrypt = require("bcrypt");
var cors = require('cors')
const app = express();
const mysql = require("mysql");
var portfinder = require("portfinder");
var bodyParser = require('body-parser');
app.use(cors());

app.use(bodyParser.json())
require("dotenv").config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;

const db = mysql.createPool({
  connectionLimit: 100,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  //   port: DB_PORT,
});
db.getConnection((err, connection) => {
  if (err) throw err;
  console.log("DB connected successful: " + connection.threadId);
});


portfinder.getPort(function (err, port) {
  process.env.PORT = port;
  app.listen(port, () =>
    console.log(`Server Started on port ${port}...`)
  );
});

let encryptedPassword = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
}


//CREATE USER
app.post("/v1/user", async (req, res) => {
  const email = req.body.email;
  const firstName = req.body.first_name;
  const lastName = req.body.last_name;
  const hashedPassword = encryptedPassword(req.body.password);

  console.log(email);

  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM cloudDB.users WHERE email = ?"
    const search_query = mysql.format(sqlSearch, [email])

    const sqlInsert = "INSERT INTO cloudDB.users(first_name,last_name,email,password) VALUES (?,?,?,?)";
    const insert_query = mysql.format(sqlInsert, [firstName, lastName, email, hashedPassword]);

    await db.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("------> Search Results");
      console.log(result.length);
      if (result.length != 0) {
        //db.end();
        console.log("------> User already exists");
        res.sendStatus(409);
      } else {
        await connection.query(insert_query, (err, result) => {

          if (err) throw err;
          console.log("--------> Created new User");
          console.log(result.insertId);
          res.sendStatus(201);
        });
      }
    }); //end of connection.query()
  }); //end of db.getConnection()
}); //end of app.post()



app.get("/v1/user/:userId", async (req, res) => {
  const userId = req.params.userId;
  console.log('userid:' + userId);
  const authHead = Buffer.from(
    req.headers.authorization.split(" ")[1],
    "base64"
  ).toString("ascii");
  const username = authHead.split(":")[0];
  const password = authHead.split(":")[1];
  res.status(200);

  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM cloudDB.users WHERE user_id = ?"
    const search_query = mysql.format(sqlSearch, [userId])

    await db.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("------> Search Results");
      console.log(result.length);
      if (result.length == 0) {
        console.log("------> User Not Found");
        res.send("User Not Found");
        res.sendStatus(404);
      } else {
        bcrypt.compare(password, result[0].password, (err,resp) => {

          if (resp && username == result[0].email) {
            if (err) throw err;
            res.status(200);
            res.send({
              user_id: result[0].user_id,
              first_name: result[0].first_name,
              last_name: result[0].last_name,
              username: result[0].email,
            });
          }
          else
          {
            console.log("wrong password");
            res.sendStatus(401);
          }

        });     
        
      }
    }); //end of connection.query()
  }); //end of db.getConnection()
}); //end of app.post()

app.put("/v1/user/:userId", async (req, res) => {
  const userId = req.params.userId;
  console.log('userid:' + userId);
  const authHead = Buffer.from(
    req.headers.authorization.split(" ")[1],
    "base64"
  ).toString("ascii");
  const username = authHead.split(":")[0];
  const password = authHead.split(":")[1];
  res.status(200);
  // const email = req.body.email;
  const firstName = req.body.first_name;
  const lastName = req.body.last_name;
  const hashedPassword = encryptedPassword(req.body.password);

  console.log(userId);

  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM cloudDB.users WHERE user_id = ?"
    const search_query = mysql.format(sqlSearch, [userId])

    const sqlUpdate = "UPDATE cloudDB.users SET first_name = ?,last_name =?,password=? WHERE user_id=?"
    const update_query = mysql.format(sqlUpdate, [firstName, lastName, hashedPassword, userId]);

    await db.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("------> Search Results");
      console.log(result.length);
      if (result.length == 0) {
        //db.end();
        console.log("------> User not found");
        res.sendStatus(409);
      } else {
        bcrypt.compare(password, result[0].password, (err,resp) => {

          if (resp && username == result[0].email) {
            connection.query(update_query, (err, resu) => {
              //db.end();
              if (err) throw err;
              console.log("Updated new User");
              console.log(result.insertId);
              res.send(201);
            });
          }
          else
          {
            console.log("wrong password");
            res.sendStatus(401);
          }


        });

      }
    }); //end of connection.query()
  }); //end of db.getConnection()
}); //end of app.post() 
app.get("/healthz", async (req, res) => {

  res.sendStatus(200);

}); //end of app.post()