
//var app = require('express')();
//var http = require('http').Server(app);
//var io = require('socket.io')(http);
//var SSHClient = require('ssh2').Client;
var pty = require('node-pty');
 
const createNewServer = (machineConfig, socket) => {
    //var ssh = new SSHClient();

    let {msgId, ip, username, password} = machineConfig;

    const shell = pty.spawn('/bin/bash', [], {
        name: 'xterm-color',
        cwd: process.env.PWD,
        env: process.env
    });

      // For all shell data send it to the websocket
    shell.on('data', (data) => {
        socket.emit(msgId, data);
    });
      // For all websocket data send it to the shell
    socket.on(msgId, (msg) => {
        shell.write(msg+'\r');
    });
}

module.exports = {
    init: (server) => {

        //http server를 socket.io로 업그레이드
        const io = require('socket.io')(server);

        io.on('connection', socket => {
            socket.on('createNewServer', machineConfig => {
                loggerFactory.info('new socket connection is established');
                createNewServer(machineConfig, socket);
            })
         
            socket.on('disconnect', () => {
                loggerFactory.info('socket connection is disconnected');
            });
        })
    }
}