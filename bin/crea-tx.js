#! /usr/bin/env node

let crea = require('@creativechain-fdn/crea-js');
let program = require('commander');
let util = require('../src/util');
let { Asset, NAI } = require('../src/amount');

function setOptions(node) {
    node = node ? node : 'https://nodes.creary.net';
    let apiOptions = {
        nodes: [node],
        addressPrefix: 'CREA',
        chainId: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    crea.api.setOptions(apiOptions);

    crea.config.set('chain_id', apiOptions.chainId);
    crea.config.set('address_prefix', apiOptions.addressPrefix);
}

program
    .version(util.getVersion())
    .description('Crea Transaction Tools')
    .option('-n, --node <node>', 'Set node to connect', setOptions);

program.command('transfer <from> <to> <amount> <memo> <wif>')
    .description('Transfer funds to another account.')
    .action(function (from, to, amount, memo, wif) {

        let fn = async function () {
            try {
                let r = await crea.broadcast.transferAsync(wif, from, to, amount, memo);
                console.log(r);
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        };

        fn();
    });

program.command('delegateEnergy <delegator> <delegatee> <cgy> <wif>')
    .description('Delegate CGY to another account.')
    .action(function (delegator, delegatee, cgy, wif) {

        let fn = async function () {
            try {
                if (cgy.includes('CREA') || cgy.includes('CGY')) {
                    var state = await crea.api.getStateAsync('/now');
                    var energy = parseFloat(Asset.parseString(cgy).toPlainString(null, false));

                    var total_vests = parseFloat(Asset.parseString(state.props.total_vesting_shares).toPlainString(null, false));
                    var total_vest_crea = parseFloat(Asset.parseString(state.props.total_vesting_fund_crea).toPlainString(null, false));
                    cgy =  Asset.parse({
                        amount: energy / total_vest_crea * total_vests,
                        nai: NAI.vests.symbol.toLowerCase()
                    }).toFriendlyString(null, false)
                }
                console.log(cgy);
                let r = await crea.broadcast.delegateVestingSharesAsync(wif, delegator, delegatee, cgy);
                console.log(r);
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        };

        fn();
    });

program.parse(process.argv);