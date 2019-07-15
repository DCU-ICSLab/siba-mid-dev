var yaml = require('js-yaml')
var fs = require('fs')

const YAML_FILE_DIR = '/siba-hub-config.yml'


let configurations = {
    hubAuthKey: ''
}

module.exports = {
    readDevelopersConfigurations: async () => {
        return new Promise((resolve, reject)=>{fs.readFile(__dirname+YAML_FILE_DIR, {encoding:'utf8'}, (err, data)=>{

            var file;
            if(err){
                console.log('siba-hub-config.yml file cannot found')
            }
            else{
                file = yaml.safeLoad(data, 'utf8');
                const hubAuthKey = file.options['hubAuthenticationKey']
                if (hubAuthKey) {
                    console.log('hello ' + hubAuthKey);
                    configurations.hubAuthKey=hubAuthKey;
                }
            }
            resolve();
        })});
    },

    getDevelopersConfigurations: () => {
        return configurations;
    }
}