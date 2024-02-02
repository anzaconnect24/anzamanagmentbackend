'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Conversation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Conversation.belongsTo(models.User,{foreignKey:"to",as:"user1"})
      Conversation.belongsTo(models.User,{foreignKey:"from",as:"user2"})
      Conversation.hasMany(models.Message)

    }
  }
  Conversation.init({
    uuid:{
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    from: {
      type: DataTypes.INTEGER,
      allowNull:false
    },
    to: {
      type: DataTypes.INTEGER,
      allowNull:false
    },
    lastMessage:{
      type:DataTypes.STRING,
      allowNull:true
    },
    type:{
      type:DataTypes.STRING,
      allowNull:false
    },
  }, {
    sequelize,
    modelName: 'Conversation',
  });
  return Conversation;
};