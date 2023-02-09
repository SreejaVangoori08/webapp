

module.exports=(sequelize,DataTypes)=>{
   const User=sequelize.define("user",{
   id:{
    type:DataTypes.INTEGER,
    allowNull:false,
    autoIncrement: true,
    primaryKey: true
   },
   first_name:{
    type:DataTypes.STRING,
    allowNull:false
   },
   last_name:{
    type:DataTypes.STRING,
    allowNull:false
   },
   username:{
    type:DataTypes.STRING,
    allowNull:false,
    unique:true
   },
   password:{
    type:DataTypes.STRING,
    allowNull:false
   },
//    account_created:{
//       type:DataTypes.DATE,
//       allowNull:false,
//       defaultValue: DataTypes.NOW
//    },
//    account_updated:{
//     type:DataTypes.DATE,
//     allowNull:false,
//     defaultValue: DataTypes.NOW
//  }

   }, {
    timestamps: true,
    createdAt: 'account_created',
    updatedAt: 'account_updated'
  })
   return User
}