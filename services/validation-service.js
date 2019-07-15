var redisClient = require('../config/redis');
const { promisify } = require('util');
const getAsync = promisify(redisClient.get).bind(redisClient);

const registerValidation = (req, res, next) => {
    isRegister(res,next);
}

const isRegister = async (res, next) => {
    let state = await getAsync('isreg');
    if (state === 'Y') {
        next();
    }
    else {
        res.status(200).json({
            status: false,
            error: 'please hub registration first'
        });
    }
}

module.exports = {
    registerValidation: registerValidation
}