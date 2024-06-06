'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserPermission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserPermission.belongsTo(models.User, { onDelete: 'cascade'})
      UserPermission.belongsTo(models.Permission, { onDelete: 'cascade'})
    }
  }
  UserPermission.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    userId:{
     type:DataTypes.INTEGER,
     allowNull:false
    },
    permissionId:{
     type:DataTypes.INTEGER,
     allowNull:false
    },
  }, {
    sequelize,
    modelName: 'UserPermission',
  });
  return UserPermission;
};