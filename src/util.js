const {Asset, NAI} = require('./amount');

let getVersion = function () {
    let pjson = require('../package');
    return pjson.version;
};

let sleep = function (delay) {
    let start = new Date().getTime();
    while (new Date().getTime() < start + delay);
};

let wait = function (delay = 100) {
    return setTimeout(wait, delay);
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

/**
 *
 * @param state
 * @param creaEnergy
 * @return {Asset}
 */
function cgyToVests(state, creaEnergy) {
    var energy = creaEnergy;

    if (typeof creaEnergy === 'string') {
        energy = parseFloat(Asset.parseString(creaEnergy).toPlainString(null, false));
    }

    var total_vests = parseFloat(Asset.parseString(state.props.total_vesting_shares).toPlainString(null, false));
    var total_vest_crea = parseFloat(Asset.parseString(state.props.total_vesting_fund_crea).toPlainString(null, false));
    return Asset.parse({
        amount: energy / total_vest_crea * total_vests,
        nai: 'vests'
    });
}

module.exports = {
    getVersion, sleep, wait, createAuth, cgyToVests
}