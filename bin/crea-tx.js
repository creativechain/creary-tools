#! /usr/bin/env node

let crea = require('@creativechain-fdn/crea-js');
let program = require('commander');
let util = require('../src/util');

function setOptions(node) {
    node = node ? node : 'https://node1.creary.net';
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

program.parse(process.argv);