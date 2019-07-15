/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  var user = sequelize.define('user', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true
    },
    role_type: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    mac: {
      type: DataTypes.CHAR(17),
      allowNull: false,
      references: {
        model: 'hub',
        key: 'mac'
      }
    }
  }, {
    tableName: 'user'
  });

  user.associate = (models) => {
    user.belongsTo(models.hub, {
      foreignKey: 'mac'
    })
  }

  return user;
};
