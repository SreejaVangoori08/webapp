const dbConfig=require('../config/dbConfig.js');
const{Sequelize,DataTypes, NOW}=require('sequelize');
const sequelize=new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD,{
        host: dbConfig.HOST,
        dialect: dbConfig.dialect,
        // operatorsAliases: false,
    pool:{
        max: dbConfig.pool.max,
        min: dbConfig.pool.min,
        acquire: dbConfig.pool.acquire,
        idle: dbConfig.pool.idle
    },  
    define: {
        timestamps: false
    }  
    }
)
sequelize.authenticate()
.then(()=>{
  console.log("connected")
})
.catch(err=>{
    console.log(err);

})
const db={} 
db.Sequelize=Sequelize
db.sequelize=sequelize

db.user=require('./userModel.js')(sequelize,DataTypes)
db.product=require('./productModel.js')(sequelize,DataTypes)
db.images = require("./imageModel")(sequelize, DataTypes);


db.product.hasMany(db.images, { onDelete: 'CASCADE' });
db.images.belongsTo(db.product);


db.sequelize.sync({force:false})
.then(()=>{
    console.log("sync done")
}).catch((error) => {
    console.error("Validation error: ", error);
  });

module.exports=db