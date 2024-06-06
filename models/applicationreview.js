'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ApplicationReview extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ApplicationReview.belongsTo(models.Application)
      ApplicationReview.belongsTo(models.User)
    }
  }
  ApplicationReview.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    userId:{
     type:DataTypes.INTEGER,
     allowNull:false
    },
    applicationId:{
     type:DataTypes.INTEGER,
     allowNull:false
    },
    status:{
     type:DataTypes.ENUM('pending', 'rejected','approved'),
     defaultValue:"pending"
    },
  }, {
    sequelize,
    modelName: 'ApplicationReview',
  });
  return ApplicationReview;
};