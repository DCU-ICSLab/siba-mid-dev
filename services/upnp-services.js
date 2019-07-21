var natUpnp = require('nat-upnp');
var client = natUpnp.createClient();

const upnp_options = {
    in: 3000,
    out: 54325,
    ttl: 0
}

module.exports = {
    init: async () => {
        return new Promise((resolve, reject) => {
            //let result = false;

            client.getMappings((err, results) => {
                console.log(results)
            })

            client.portMapping({
                public: upnp_options.out, //external
                private: upnp_options.in, //internal
                ttl: upnp_options.ttl
            }, (err) => {
                console.log(err)
                if (!err){
                    loggerFactory.info(`upnp established, [in: ${upnp_options.in} <-- out: ${upnp_options.out}]`);
                }
                else{
                    loggerFactory.info('upnp port mapping failed');
                    result = false;
                }
                resolve(true)
            });

            /*client.getMappings((err, results) => {

                //upnp를 수행하고자 하는 포트가 기존에 매핑되어 있었는지?
                results.some(element => {
                    result = (element.public.port === upnp_options.out)
                    if(result) loggerFactory.info('upnp is already defined');
                    return result;
                });

                //매핑되어 있지 않다면 UPNP 수행
                if(!result){
                    client.portMapping({
                        public: upnp_options.out, //external
                        private: upnp_options.in, //internal
                        ttl: upnp_options.ttl
                    }, (err) => {
                        if (!err){
                            loggerFactory.info(`upnp established, [in: ${upnp_options.in} <-- out: ${upnp_options.out}]`);
                        }
                        else{
                            loggerFactory.info('upnp port mapping failed');
                            result = false;
                        }
                        resolve(true)
                    });
                }
                else{
                    resolve(true)
                }
            });*/
        })
    },

    getUpnpOptions: () => {
        return upnp_options;
    }
}