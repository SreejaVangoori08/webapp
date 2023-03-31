const db = require("../model");
const bcrypt = require("bcrypt");
const { products } = require("../model");
const isEmail = require("./userController");
const imageController = require("./imageController");
const AWS = require("aws-sdk");
const Product = db.product;
const User = db.user;
const Image = db.images;
const awsBucketName = process.env.AWS_BUCKET_NAME;
// const awsBucketName = "sreejabucket"

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

const s3 = new AWS.S3({
  // accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  // secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.aws_region,
  // accessKeyId: "AKIATPUL2BF25TRYCEPQ",
  // secretAccessKey: "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",
  // region: "us-east-1",
});

const addproduct = async (req, res) => {
  statsdClient.increment('POST.addproduct.count');
  logger.log('info','Started addproduct endpoint');
    let authorizationSuccess = false;
    let userDetails = "";
    let authheader = req.headers.authorization;
    if (!authheader) {
        res.status(401).send("Unauthorized");
        logger.log('error','No authorization of user is given for addproduct endpoint');
    } else {
        //User Auth Check Start
        var auth = new Buffer.from(authheader.split(" ")[1], "base64")
            .toString()
            .split(":");

        var username = auth[0];
        var password = auth[1];
        if (!isEmail.isEmail(username)) {
            res.status(401).send("Authentication Failed, Please enter a valid email");
        } else {
            userDetails = await User.findOne({
                where: {
                    username: username,
                },
            });
            if (userDetails == null) {
                console.log("------> User Not Found");
                res.status("User Not Found").sendStatus(401);
                logger.log('warn','User not found for addproduct endpoint');
            } else {
                bcrypt.compare(password, userDetails.password, (err, result) => {
                    if (err) throw err;
                    authorizationSuccess = result;
                    if (authorizationSuccess) {
                        console.log("Authorization Successful!");
                        const allowedParams = [
                            "name",
                            "description",
                            "sku",
                            "manufacturer",
                            "quantity",
                        ];
                        const receivedParams = Object.keys(req.body);
                        const unwantedParams = receivedParams.filter(
                            (param) => !allowedParams.includes(param)
                        );
                        const notReceivedParams = allowedParams.filter(
                            (param) => !receivedParams.includes(param)
                        );

                        if (unwantedParams.length) {
                            res.status(400).send({
                                error: `The following parameters are not allowed: ${unwantedParams.join(
                                    ", "
                                )}`,
                            });
                        } else if (notReceivedParams.length) {
                            res.status(400).send({
                                error: `The following required parameters are not received: ${notReceivedParams.join(
                                    ", "
                                )}`,
                            });
                        } else {
                            const name = req.body.name;
                            const description = req.body.description;
                            const sku = req.body.sku;
                            const manufacturer = req.body.manufacturer;
                            const quantity = req.body.quantity;
                            if (name == undefined || name == null || name == "") {
                                res.status(400).send("Product Name is required!");
                            } else if (
                                description == undefined ||
                                description == null ||
                                description == ""
                            ) {
                                res.status(400).send("Product description is required!");
                            } else if (sku == undefined || sku == null) {
                                res.status(400).send("Product sku is required!");
                            } else if (
                                manufacturer == undefined ||
                                manufacturer == null ||
                                manufacturer == ""
                            ) {
                                res.status(400).send("Product manufacturer is required!");
                            } else if (
                                quantity == undefined ||
                                quantity == null ||
                                quantity == ""
                            ) {
                                res.status(400).send("Product quantity is required!");
                            } else if (
                                !(typeof quantity === "number" && Number.isInteger(quantity))
                            ) {
                                res.status(400).send("Product quantity needs to be Integer!");
                            } else if (quantity < 0 || quantity > 100) {
                                res
                                    .status(400)
                                    .send("Product quantity needs to be between 0 to 100!");
                            } else {
                                searchProduct(sku).then((productDetails) => {
                                    if (productDetails) {
                                        res.status(400).send("Product SKU already exists");
                                        logger.log('warn','Used already existing sku fail for addproduct endpoint');
                                    } else {
                                        let newProduct = {
                                            name: req.body.name,
                                            description: req.body.description,
                                            sku: req.body.sku,
                                            manufacturer: req.body.manufacturer,
                                            quantity: req.body.quantity,
                                            owner_user_id: userDetails.id,
                                        };
                                        createProduct(newProduct).then((product) => {
                                            // console.log("product");
                                            // console.log(product);
                                            //   searchProduct(sku).then((createdProductDetails) => {
                                            let createdProductDetails = product;
                                            res.status(201).send({
                                                id: createdProductDetails.id,
                                                name: createdProductDetails.name,
                                                description: createdProductDetails.description,
                                                sku: createdProductDetails.sku,
                                                manufacturer: createdProductDetails.manufacturer,
                                                quantity: createdProductDetails.quantity,
                                                date_added: createdProductDetails.date_added,
                                                date_last_updated: createdProductDetails.date_last_updated,
                                                owner_user_id: createdProductDetails.owner_user_id,
                                            });
                                        });
                                        logger.log('info','Product Added for addproduct endpoint');
                                       
                                        // });
                                    }
                                });
                            }
                        }
                    } else {
                        console.log("Authentication Failed");
                        res.status(401).send("Authentication Failed");
                        logger.log('error','Authentication failed for addproduct endpoint');

                    }
                });
            }
        }
        //User Auth Check End
    }
};
const patchproduct = async (req, res) => {
  statsdClient.increment('PATCH.patchproduct.count');
  logger.log('info','Started for patchproduct endpoint');
    const productId = req.params.pId;
    let authorizationSuccess = false;
    let userDetails = "";
    let authheader = req.headers.authorization;
    if (!authheader) {
      res.status(401).send("Unauthorized");
      logger.log('error','No authorization of user is given for patchproduct endpoint');
    } else {
      //User Auth Check Start
      var auth = new Buffer.from(authheader.split(" ")[1], "base64")
        .toString()
        .split(":");
  
      var username = auth[0];
      var password = auth[1];
      if (!isEmail.isEmail(username)) {
        res.status(401).send("Authentication Failed, Please enter a valid email");
        logger.log('error','invalid email for addproduct endpoint');
      } else {
        userDetails = await User.findOne({
          where: {
            username: username,
          },
        });
        if (userDetails == null) {
          console.log("------> User Not Found");
          res.status("User Not Found").sendStatus(401);
        } else {
          bcrypt.compare(password, userDetails.password, (err, result) => {
            if (err) throw err;
            authorizationSuccess = result;
            if (authorizationSuccess) {
              console.log("Authorization Successful!");
              logger.log('info','Authorization Successful! for patchproduct endpoint');
             ownerProduct(productId).then((product) => {
                  if(product == null){
                      res.status(400).send("Product Not Found");
                      logger.log('error','Product not found for patchproduct endpoint');
                  }
                else if (userDetails.id == product.owner_user_id) {
                  //Updating Product Details
                  const allowedParams = [
                    "name",
                    "description",
                    "sku",
                    "manufacturer",
                    "quantity",
                  ];
                  const receivedParams = Object.keys(req.body);
                  const unwantedParams = receivedParams.filter(
                    (param) => !allowedParams.includes(param)
                  );
                  const notReceivedParams = allowedParams.filter(
                    (param) => !receivedParams.includes(param)
                  );
  
                  if (unwantedParams.length) {
                    res.status(400).send({
                      error: `The following parameters are not allowed: ${unwantedParams.join(
                        ", "
                      )}`,
                    });
                  }
                  // else if (notReceivedParams.length) {
                  //   res.status(400).send({
                  //     error: `The following required parameters are not received: ${notReceivedParams.join(
                  //       ", "
                  //     )}`,
                  //   });
                  // }
                  else {
                    let name = req.body.name;
                    let description = req.body.description;
                    let sku = req.body.sku;
                    let manufacturer = req.body.manufacturer;
                    let quantity = req.body.quantity;
                    if (
                      receivedParams.includes("name") &&
                      (name == null || name == "")
                    ) {
                      res.status(400).send("Product Name cannot be null!");
                    } else if (
                      receivedParams.includes("description") &&
                      (description == null || description == "")
                    ) {
                      res.status(400).send("Product description is required!");
                    } else if (
                      receivedParams.includes("sku") &&
                      (sku == "" || sku == null)
                    ) {
                      res.status(400).send("Product sku is required!");
                    } else if (
                      receivedParams.includes("manufacturer") &&
                      (manufacturer == null || manufacturer == "")
                    ) {
                      res.status(400).send("Product manufacturer is required!");
                    } else if (
                      receivedParams.includes("quantity") &&
                      (quantity == null || quantity == "")
                    ) {
                      res.status(400).send("Product quantity is required!");
                    } else if (
                      receivedParams.includes("quantity") &&
                      !(
                        typeof quantity === "number" && Number.isInteger(quantity)
                      )
                    ) {
                      res
                        .status(400)
                        .send("Product quantity needs to be Integer!");
                    } else if (quantity < 0 || quantity > 100) {
                      res
                        .status(400)
                        .send("Product quantity needs to be between 0 to 100!");
                    } else {
                      ownerProduct(productId).then((productDetails) => {
                        if (!productDetails) {
                          res.status(403).send("Product not found");
                          logger.log('warn','Product not found for patchproduct endpoint');
                        } else if (
                          productDetails.owner_user_id != userDetails.id
                        ) {
                          res.status(403).send("Forbidden");
                        } else {
                          if (name == undefined) name = productDetails.name;
                          if (description == undefined)
                            description = productDetails.description;
                          if (manufacturer == undefined)
                            manufacturer = productDetails.manufacturer;
                          if (sku == undefined) sku = productDetails.sku;
                          if (quantity == undefined)
                            quantity = productDetails.quantity;
                          let newProduct = {
                            id: productId,
                            name: name,
                            description: description,
                            sku: sku,
                            manufacturer: manufacturer,
                            quantity: quantity,
                          };
                          searchProduct(sku).then((prod) => {
                            if (prod && receivedParams.includes("sku") && prod.id!=productId) {
                              res.status(400).send("Product SKU already exists");
                            } else {
                              //Update Product Function
                              updateProduct(newProduct).then((product) => {
                                console.log("updatedProd");
                                console.log(product);
                                res.sendStatus(204);
                                logger.log('info','Product Updated for patchproduct endpoint');
                              });
                             
                            }
                          });
                        }
                      });
                    }
                  }
                } else {
                  res.status("Forbidden").sendStatus(403);
                }
              });
            } else {
              console.log("Authentication Failed");
              res.status(401).send("Authentication Failed");
              logger.log('error','Authentication failed for patchproduct endpoint');
            }
          });
        }
      }
    }
  };
  
  const updateproduct = async (req, res) => {
    statsdClient.increment('UPDATE.updateproduct.count');
    logger.log('info','API start of updateproduct endpoint');
    const productId = req.params.pId;
    let authorizationSuccess = false;
    let userDetails = "";
    let authheader = req.headers.authorization;
    if (!authheader) {
      res.status(401).send("Unauthorized");
      logger.log('error','No Auth given for updateproduct endpoint');
    } else {
      //User Auth Check Start
      var auth = new Buffer.from(authheader.split(" ")[1], "base64")
        .toString()
        .split(":");
  
      var username = auth[0];
      var password = auth[1];
      if (!isEmail.isEmail(username)) {
        res.status(401).send("Authentication Failed, Please enter a valid email");
        logger.log('error','Enter valid email updateproduct endpoint');
      } else {
        userDetails = await User.findOne({
          where: {
            username: username,
          },
        });
        if (userDetails == null) {
          console.log("------> User Not Found");
          res.status("User Not Found").sendStatus(401);
          logger.log('error','User Not Found updateproduct endpoint');
        } else {
          bcrypt.compare(password, userDetails.password, (err, result) => {
            if (err) throw err;
            authorizationSuccess = result;
            if (authorizationSuccess) {
              console.log("Authorization Successful!");
              ownerProduct(productId).then((product) => {
                  if(product == null){
                      res.status(400).send("Product Not Found");
                  }
                else if (userDetails.id == product.owner_user_id) {
                  //Updating Product Details
                  const allowedParams = [
                    "name",
                    "description",
                    "sku",
                    "manufacturer",
                    "quantity",
                  ];
                  const receivedParams = Object.keys(req.body);
                  const unwantedParams = receivedParams.filter(
                    (param) => !allowedParams.includes(param)
                  );
                  const notReceivedParams = allowedParams.filter(
                    (param) => !receivedParams.includes(param)
                  );
  
                  if (unwantedParams.length) {
                    res.status(400).send({
                      error: `The following parameters are not allowed: ${unwantedParams.join(
                        ", "
                      )}`,
                    });
                  } else if (notReceivedParams.length) {
                    res.status(400).send({
                      error: `The following required parameters are not received: ${notReceivedParams.join(
                        ", "
                      )}`,
                    });
                  } else {
                    const name = req.body.name;
                    const description = req.body.description;
                    const sku = req.body.sku;
                    const manufacturer = req.body.manufacturer;
                    const quantity = req.body.quantity;
                    if (name == undefined || name == null || name == "") {
                      res.status(400).send("Product Name is required!");
                    } else if (
                      description == undefined ||
                      description == null ||
                      description == ""
                    ) {
                      res.status(400).send("Product description is required!");
                    } else if (sku == undefined || sku == null || sku == "") {
                      res.status(400).send("Product sku is required!");
                    } else if (
                      manufacturer == undefined ||
                      manufacturer == null ||
                      manufacturer == ""
                    ) {
                      res.status(400).send("Product manufacturer is required!");
                    } else if (
                      quantity == undefined ||
                      quantity == null ||
                      quantity == ""
                    ) {
                      res.status(400).send("Product quantity is required!");
                    } else if (
                      !(
                        typeof quantity === "number" && Number.isInteger(quantity)
                      )
                    ) {
                      res
                        .status(400)
                        .send("Product quantity needs to be Integer!");
                    } else if (quantity < 0 || quantity > 100) {
                      res
                        .status(400)
                        .send("Product quantity needs to be between 0 to 100!");
                    } else {
                      ownerProduct(productId).then((productDetails) => {
                        if (!productDetails) {
                          res.status(403).send("Product not found");
                          logger.log('warn','Product not found updateproduct endpoint');
                        } else if (
                          productDetails.owner_user_id != userDetails.id
                        ) {
                          res.status(403).send("Forbidden");
                        } else {
                          let newProduct = {
                            id: productId,
                            name: req.body.name,
                            description: req.body.description,
                            sku: req.body.sku,
                            manufacturer: req.body.manufacturer,
                            quantity: req.body.quantity,
                          };
                          searchProduct(sku).then((prod) => {
                            if (prod!=null && prod.id!=productId) {
                              res.status(400).send("Product SKU already exists");
                              logger.log('error','product sku already exists updateproduct endpoint');
                            } else {
                              //Update Product Function
                              updateProduct(newProduct).then((product) => {
                                console.log("updatedProd");
                                console.log(product);
                                res.sendStatus(204);
                                logger.log('info','Update Success updateproduct endpoint');
                              });
                            }
                          });
                        }
                      });
                    }
                  }
                } else {
                  res.status("Forbidden").sendStatus(403);
                }
              });
            } else {
              console.log("Authentication Failed");
              res.status(401).send("Authentication Failed");
              logger.log('error','Authentication fail updateproduct endpoint');
            }
          });
        }
      }
    }
  };


const getproduct = async (req, res) => {
  statsdClient.increment('GET.getproduct.count');
  logger.log('info','API start of getproduct endpoint');
    let pId = req.params.pId;
    const prod = await Product.findOne({ where: { id: pId, }, }).then(prod=>{
        if (prod == null) {
            res.status(404).send("Product not found");
            logger.log('error','Product not found getproduct endpoint');
        }
        else {
            res.status(200).send({
    
                "id": prod.id,
                "name": prod.name,
                "description": prod.description,
                "sku": prod.sku,
                "manufacturer": prod.manufacturer,
                "quantity": prod.quantity,
                "date_added": prod.date_added,
                "date_last_updated": prod.date_last_updated,
                "owner_user_id": prod.owner_user_id
    
    
            });
    
        }

    }

    );

  

};

const deleteproduct = async (req, res) => {
  statsdClient.increment('DEL.deleteproduct.count');
  logger.log('info','API start of deleteproduct endpoint');
    let pId = req.params.pId;

    let authorizationSuccess = false;
    let userDetails = "";
    let authheader = req.headers.authorization;
    if (!authheader) {
        res.status(401).send("Unauthorized");
        logger.log('error','No Authorization addproduct endpoint');
    } else {
        //User Auth Check Start
        var auth = new Buffer.from(authheader.split(" ")[1], "base64")
            .toString()
            .split(":");

        var username = auth[0];
        var password = auth[1];
        if (!isEmail.isEmail(username)) {
            res.status(401).send("Authentication Failed, Please enter a valid email");
        } else {
            userDetails = await User.findOne({
                where: {
                    username: username,
                },
            });
            if (userDetails == null) {
                console.log("------> User Not Found");
                res.status("User Not Found").sendStatus(401);
                logger.log('error','User not found deleteproduct endpoint');
            } else {
                bcrypt.compare(password, userDetails.password, (err, result) => {
                    if (err) throw err;
                    authsuc = result;
                    if (authsuc) {
                        console.log("auth success")

                        ownerProduct(pId).then(productDetails => {
                            if (productDetails == null) {
                                res.status(404).send("not found")
                            }

                            else if (productDetails.owner_user_id == userDetails.id) {
                              deleteImagesInS3WithProductId(pId).then(()=>{
                                deleteProduct(pId).then(rt=>res.sendStatus(204));
                                logger.log('info','Product deleted getproduct endpoint');
                              });
                                
                            }
                            else {
                                res.status(403).send("forbidden")
                                logger.log('warn','Forbidden getproduct endpoint');
                            }

                        })
                    }
                    else {
                        res.status(401).send("unauthorized")
                        logger.log('error','Unauthorized getproduct endpoint');
                    }



                });


            }
        }


    }
};

const searchProduct = async (sku) => {
    const productDetails = await Product.findOne({
        where: {
            sku: sku,
        },
    });
    return productDetails;
};
const ownerProduct = async (id) => {
    const productDetails = await Product.findOne({
        where: {
            id: id,
        },
    });
    return productDetails;
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

const createProduct = async (prod) => {
    const product = await Product.create(prod);
    return product;
};
const deleteProduct = async (id) => {
    await Product.destroy({
        where: { id: id },
    })
    return true;
};


const updateProduct = async (prod) => {
    const updatedProd = Product.update(prod, {
      where: {
        id: prod.id,
      },
    });
    return updatedProd;
  };

module.exports = {
    addproduct,
    updateproduct,
    patchproduct,
    getproduct,
    deleteproduct,
    ownerProduct
};