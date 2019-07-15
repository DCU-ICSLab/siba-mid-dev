var http = require('http');

module.exports = {

    req: (url, data, method, func) =>{

        var options = {
            host: '', //skill server url
            port: 80,
            path: url, //skill server port
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }

        var httpReq = http.request(options, (res)=>{
            res.setEncoding('utf8');
            loggerFactory.info('response on');
        });
        httpReq.write(data);
        httpReq.end();

        if(func) func();
    }
}