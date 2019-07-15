var winston = require('winston');
var winstonDaily = require('winston-daily-rotate-file');
var moment = require('moment');
var fs = require('fs');
var path = require('path');

const logDir = 'log';

//익명 즉시 실행 함수
(function (){
    if(!fs.existsSync(logDir)) //log 디렉터리가 존재하지 않는다면 생성
        fs.mkdirSync(logDir);
})();

 
const timeStampFormat = () => {
    return moment().format('YYYY-MM-DD HH:mm:ss.SSS ZZ');                            
};

//logger 설정
var logger = new winston.createLogger({
    level: 'debug', //최소 레벨
    transports: [
        new (winstonDaily)({
            name: 'info-file',
            filename: path.join(logDir,'/server'),
            datePattern: '_yyyy-MM-dd.log',
            colorize: false,
            maxsize: 50000000,
            maxFiles: 1000,
            level: 'info',
            showLevel: true,
            json: false,
            timestamp: timeStampFormat
        }),
        new (winston.transports.Console)({
            name: 'debug-console',
            colorize: true,
            level: 'debug',
            showLevel: true,
            json: false,
            timestamp: timeStampFormat
        })
    ],
    exceptionHandlers: [
        new (winstonDaily)({
            name: 'exception-file',
            filename: path.join(logDir,'/exception'),
            datePattern: '_yyyy-MM-dd.log',
            colorize: false,
            maxsize: 50000000,
            maxFiles: 1000,
            level: 'error',
            showLevel: true,
            json: false,
            timestamp: timeStampFormat
        }),
        new (winston.transports.Console)({
            name: 'exception-console',
            colorize: true,
            level: 'debug',
            showLevel: true,
            json: false,
            timestamp: timeStampFormat
        })
    ]
});

module.exports = logger;