var Gpio = require('onoff').Gpio;

const led_sets = {
    red: new Gpio(27,'out'),
    blue: new Gpio(17,'out'),
    green: new Gpio(25,'out')
}

const rgb_control = (r,g,b)=>{
    led_sets.red.writeSync(r);
    led_sets.green.writeSync(g);
    led_sets.blue.writeSync(b);
}

module.exports = {
    process:()=>{
        //blue led
        rgb_control(0,0,1);
    },
    error:()=>{
        //red led
        rgb_control(1,0,0);
    },
    enable:()=>{
        //green led
        rgb_control(0,1,0);
    }
}