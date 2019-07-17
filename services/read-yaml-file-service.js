var yaml = require('js-yaml')
var fs = require('fs')

const YAML_FILE_DIR = '/siba-hub-config.yml'


let configurations = {
    hubAuthKey: '',
    iotHubSsid: '',
    iotHubPassword: ''
}

module.exports = {
    readDevelopersConfigurations: async () => {
        return new Promise((resolve, reject)=>{fs.readFile(__dirname+YAML_FILE_DIR, {encoding:'utf8'}, (err, data)=>{

            var file;
            let result = false;

            if(err){
                loggerFactory.error('siba-hub-config.yml file cannot found');
                result=false;
            }
            else{
                file = yaml.safeLoad(data, 'utf8');
                const hubAuthKey = file.options['hubAuthenticationKey']
                const iotHubSsid = file.options['iotHubSsid']
                const iotHubPassword = file.options['iotHubPassword']

                if (hubAuthKey) {

                    //hub auth key validation
                    if(hubAuthKey.length ===32 ){
                        configurations.hubAuthKey=hubAuthKey;
                        result=true;
                    }
                    else{
                        loggerFactory.error('hub Authentication key is invalid');
                    }

                    //hub name validation
                    if(!iotHubSsid || iotHubSsid===''){
                        loggerFactory.error('hub SSID is invalid');
                        result=false;
                    }
                    else{
                        configurations.iotHubSsid=iotHubSsid;
                        result=true;
                    }

                    //hub password validation
                    if(!iotHubPassword || iotHubPassword===''){
                        loggerFactory.error('hub password is invalid');
                        result=false;
                    }
                    else{
                        configurations.iotHubPassword=iotHubPassword;
                        result=true;
                    }
                }
                else{
                    loggerFactory.error('hub Authentication key is undefined');
                    result=false;
                }
            }
            resolve(result);
        })});
    },

    getDevelopersConfigurations: () => {
        return configurations;
    }
}