
let getVersion = function () {
    let pjson = require('../package');
    return pjson.version;
};

let sleep = function (delay) {
    let start = new Date().getTime();
    while (new Date().getTime() < start + delay);
};

let createAuth = function(key) {
    return {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [
            [key, 1]
        ]
    }
};

module.exports = {
    getVersion, sleep, createAuth
}