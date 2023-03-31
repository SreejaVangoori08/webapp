const express = require("express");
const db = require("../model");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { images } = require("../model");
const isEmail = require("./userController");
const productController = require("./productController");
const app = require("../server");
const AWS = require("aws-sdk");
const fs = require("fs");

const Product = db.product;
const User = db.user;
const Image = db.images;

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

const awsBucketName = process.env.AWS_BUCKET_NAME;
// const awsBucketName = "sreejabucket"

const s3 = new AWS.S3({
  // accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  // secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.aws_region,
//   accessKeyId: "AKIATPUL2BF25TRYCEPQ",
//   secretAccessKey: "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",
//   region: "us-east-1",
});

// Upload image to S3 bucket
const uploadImageToS3 = (bucketName, fileName, filePath) => {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileContent,
    ContentType: "image/jpeg",
    ACL: "private",
  };

  return s3.upload(params).promise();
};

const addImage = async (req, res) => {
  statsdClient.increment('POST.addimage.count');
  logger.log('info','Started addimage endpoint');
  if (!req.is("multipart/form-data")) {
    return res
      .status(400)
      .send("Invalid Request Type - Use 'multipart/form-data'");
  } else if (!req.file) {
    return res.status(400).send("Please upload an image");
  } else {
    const productId = req.params.productId;
    let authorizationSuccess = false;
    let userDetails = "";
    let productDetails = "";
    let authheader = req.headers.authorization;
    if (!authheader) {
      res.status(401).send("Unauthorized");
      logger.log('error','No basicAuth addimage endpoint');
    } else {
      //User Auth Check Start
      var auth = new Buffer.from(authheader.split(" ")[1], "base64")
        .toString()
        .split(":");
      var username = auth[0];
      var password = auth[1];
      if (!isEmail.isEmail(username)) {
        res
          .status(401)
          .send("Authentication Failed, Please enter a valid email");
          logger.log('error','Invalid email addimage endpoint');
      } else {
        userDetails = await User.findOne({
          where: {
            username: username,
          },
        });
        if (userDetails == null) {
         
          res.status("User Not Found").sendStatus(401);
          logger.log('error','User not found addimage endpoint');
        } else {
          bcrypt.compare(password, userDetails.password, (err, result) => {
            if (err) throw err;
            authorizationSuccess = result;
            if (authorizationSuccess) {
              
              ownerProduct(productId).then((product) => {
                if (product == null) {
                
                  res.sendStatus(401);
                } else if (product.owner_user_id != userDetails.id) {
                  res.sendStatus(403);
                  logger.log('warn','Forbidden addimage endpoint');
                } else {
                  //Image Upload to S3
                  uploadImageToS3(
                    awsBucketName,
                    req.file.filename,
                    req.file.path
                  )
                    .then((data) => {
                      console.log(data);
                      const imgData = {
                        product_id: product.id,
                        file_name: data.Key,
                        s3_bucket_path: data.Location,
                        productId: product.id,
                      };
                      createImage(imgData).then((imgRes) => {
                        console.log(imgRes);
                        if (imgRes == null) {
                          console.log("Image Creation Failed");
                          res.status(400).send("Image Creation Failed");
                        } else {
                          res.status(201).send({
                            image_id: imgRes.image_id,
                            product_id: imgRes.product_id,
                            file_name: imgRes.file_name,
                            date_created: imgRes.date_created,
                            s3_bucket_path: imgRes.s3_bucket_path,
                          });
                        }
                      });
                      logger.log('info','Image creation Success addimage endpoint');
                    })
                    .catch((error) => {
                      console.error(error);
                      res.status(401).send(error);
                    });
                }
              });
            } else {
              console.log("Authentication Failed");
              res.status(401).send("Authentication Failed");
              logger.log('error','Authentication Failed addimage endpoint');
            }
          });
        }
      }
    }
  }
};

const deleteImage = async (req, res) => {
  statsdClient.increment('DEL.deleteimage.count');
  logger.log('info','Started deleteimage endpoint');
  let userDetails = "";
  let pId = req.params.productId;
  let imgId = req.params.imageId;
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
    logger.log('error','No basicAuth deleteimage endpoint');
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter a valid email");
      logger.log('error','Authentication Failed deleteimage endpoint');
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
        logger.log('error','User not found deleteimage endpoint');
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          if (result) {
            
            ownerProduct(pId).then((pdetails) => {
              if (pdetails == null) {
                res.status(404).send("not found");
              } else if (pdetails.owner_user_id != userDetails.id) {
                res.status(403).send("forbidden");
                logger.log('warn','Forbidden deleteimage endpoint');
              } else {
                searchImageWithId(imgId).then((imageDetails) => {
                  if (imageDetails == null) {
                    res.status(404).send("not found");
                  } else if (imageDetails.product_id == pId) {
                    //Delete Image from S3
                    s3.deleteObject({
                      Bucket: awsBucketName,
                      Key: imageDetails.file_name,
                    }).promise();
                    //Delete Image in DB
                    deleteImageFromDb(imgId).then((rt) => res.sendStatus(204));
                    logger.log('info','Deletion Successful deleteimage endpoint');
                  } else {
                    res.sendStatus(400);
                  }
                });
              }
            });
          } else {
            res.status(401).send("unauthorized");
            logger.log('error','Unauthorized deleteimage endpoint');
          }
        });
      }
    }
  }
};

const getAllImages = async (req, res) => {
  statsdClient.increment('GET.getAllimages.count');
  logger.log('info','Started getAllImages endpoint');
  let userDetails = "";
  let pId = req.params.productId;
  let imgId = req.params.imageId;
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
    logger.log('error','no basicAuth getAllImages endpoint');
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter a valid email");
      logger.log('info','Authentication Failed, Please enter a valid email getAllImages endpoint');
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
        logger.log('error','User not found getAllImages endpoint');
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          if (result) {
            ownerProduct(pId).then((pdetails) => {
              if (pdetails == null) {
                res.status(404).send("not found");
              } else if (pdetails.owner_user_id != userDetails.id) {
                res.status(403).send("forbidden");
                logger.log('warn','Forbidden getAllImages endpoint');
              } else {
                getAllImagesByProduct(pId).then((iList) => {
                  if (iList.length == 0) {
                    res.sendStatus(404);
                  } else {
                    res.status(200).send(iList);
                    logger.log('info','Success getAllImages endpoint');
                  }
                });
              }
            });
          } else {
            res.status(401).send("unauthorized");
            logger.log('error','unauthorized getAllImages endpoint');
          }
        });
      }
    }
  }
};

const getImage = async (req, res) => {
  statsdClient.increment('GET.getimage.count');
  logger.log('info','Started getImage endpoint');
  let userDetails = "";
  let pId = req.params.productId;
  let imgId = req.params.imageId;
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
    logger.log('error','no basicAuth getImage endpoint');
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter a valid email");
      logger.log('error','Authentication Failed, Please enter a valid email getImage endpoint');
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
        logger.log('error','User Not Found getImage endpoint');
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          if (result) {
            ownerProduct(pId).then((pdetails) => {
              if (pdetails == null) {
                res.status(404).send("not found");
              } else if (pdetails.owner_user_id != userDetails.id) {
                res.status(403).send("forbidden");
                logger.log('info','Forbidden getImage endpoint');
              } else {
                searchImageWithId(imgId).then((imageDetails) => {
                  if (imageDetails == null) {
                    res.sendStatus(404);
                  } else if (imageDetails.product_id != pId) {
                    res.sendStatus(400);
                  } else {
                    res.status(200).send(imageDetails);
                    logger.log('info','Success getImage endpoint');
                  }
                });
              }
            });
          }
          else {
            res.status(401).send("unauthorized")
            logger.log('error','unauthorized getImage endpoint');
        }
        });
      }
    }
  }
};

const createImage = async (img) => {
  const image = await Image.create(img);
  return image;
};

const searchImageWithId = async (id) => {
  const imageDetails = await Image.findOne({
    where: {
      image_id: id,
    },
    attributes: [
      "image_id",
      "product_id",
      "file_name",
      "date_created",
      "s3_bucket_path",
    ],
  });
  return imageDetails;
};

const getAllImagesByProduct = async (productId) => {
  const imagesList = await Image.findAll({
    where: {
      product_id: productId,
    },
    attributes: [
      "image_id",
      "product_id",
      "file_name",
      "date_created",
      "s3_bucket_path",
    ],
  });
  return imagesList;
};

const deleteImageFromDb = async (id) => {
  await Image.destroy({
    where: { image_id: id },
  });
  return true;
};

const deleteImagesInS3WithProductId = async (productId) => {
    try {
      const imagesList = await getAllImagesByProduct(productId);
      const promises = imagesList.map((image) => {
        return s3.deleteObject({
          Bucket: awsBucketName,
          Key: image.file_name,
        }).promise();
      });
      await Promise.all(promises);
      console.log(`Successfully deleted all images for product ID: ${productId}`);
    } catch (err) {
      console.error(`Error deleting images for product ID ${productId}: ${err}`);
    }
  };
const ownerProduct = async (id) => {
  const productDetails = await Product.findOne({
    where: {
      id: id,
    },
  });
  return productDetails;
};
module.exports = {
  addImage,
  deleteImage,
  getAllImages,
  getImage,
 
};
