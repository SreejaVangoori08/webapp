const express=require('express')
const cors=require('cors')
const app=express()
app.use(express.json())
app.use(express.urlencoded({extended:true}))
const multer = require("multer");
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

const routers=require('./routes/userRouter.js')
app.use('/v1/user',routers)
const routersp=require('./routes/productRouter.js')
app.use('/v1/product',routersp)
const routersImage = require("./routes/imageRouter");
app.use("/v1/product", routersImage);

var portfinder = require("portfinder");
// const { routes } = require('.')

portfinder.getPort(function (err, port) {
    process.env.PORT = port;
    app.listen(port, () => console.log(`Server Started on port ${port}...`));
}); 

app.get("/healthz", async (req, res) => {
  statsdClient.increment('GET.healthz.count');
    res.status(200).send("OK");
    logger.log('info','healthz okay endpoint');
    
});
app.get("/health", async (req, res) => {
  statsdClient.increment('GET.health.count');
    res.status(200).send("OK health");
    logger.log('info','health okay endpoint');
    
});

app.use((err, req, res, next) => {
    
    if (err instanceof multer.MulterError) {
      res.status(400).json({ message: 'Invalid field name for file upload' });
    } else if (err) {
        res.status(400).send({ error: 'Bad Request', message: 'Unexpected file' });
    }else {
      next(err);
    }
  });

module.exports  = app;