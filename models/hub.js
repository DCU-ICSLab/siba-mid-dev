/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  var hub = sequelize.define('hub', {
    mac: {
      type: DataTypes.CHAR(17),
      allowNull: false,
      primaryKey: true
    },
    cur_ip: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    prev_ip: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    upnp_port: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    is_reg: {
      type: DataTypes.INTEGER(1),
      allowNull: true
    },
    reg_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'hub'
  });

  hub.assoicate = (models)=>{
    hub.hasMany(models.dev);
    hub.hasMany(models.user);
    hub.hasOne(models.rf,{
      foreignKey: 'mac',
      as: 'rf'
    })
    hub.hasOne(models.ap,{
      foreignKey: 'mac',
      as: 'ap'
    })
  }

  return hub;
};
