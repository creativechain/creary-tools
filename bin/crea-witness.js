#! /usr/bin/env node

let crea = require('@creativechain-fdn/crea-js');
let program = require('commander');
let util = require('../src/util');

function setOptions(node) {
    node = node || 'https://nodes.creary.net';
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
    .description('Crea Witness Tools')
    .option('-n, --node <node>', 'Set node to connect', setOptions);

program.command('update <wif> <witness> <owner> <url> <signingKey> <props> <fee>')
    .description('Create Or Update new witness')
    .action(function (wif, witness, owner, url, signingKey, props, fee) {
        let fn = async function () {
            await crea.broadcast.witnessUpdateAsync(wif, owner, url, signingKey, props, fee);

            console.log('Witness ' + witness + ' updated!');
        };

        fn();
    });

program.command('update-price <wif> <witness>')
    .description('Update Crea price with internal market ticker')
    .action(function (wif, witness) {
        let fn = async function () {
            let ticker = await crea.api.getTickerAsync();

            let price = {
                base: parseFloat(ticker.latest).toFixed(3) + ' CBD', // Price per 1 CREA
                quote: '1.000 CREA'
            };

            let response = await crea.broadcast.feedPublishAsync(wif, witness, price);
            console.log('Price updated!', response)

        };

        fn();
    });

program.parse(process.argv);