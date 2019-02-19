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

function createAccount(creator, wif, user, active, posting, memo, owner, json, cgy) {
    let fn = async function () {
        let props = await crea.api.getChainPropertiesAsync();
        let fee = props.account_creation_fee;

        //console.log(creator, wif, user, active, posting, memo, owner, json, fee);
        let r = await crea.broadcast.accountCreateAsync(wif, fee, creator, user, util.createAuth(owner),
            util.createAuth(active), util.createAuth(posting), memo, json);

        if (r) {
            console.log(r);

            if (cgy) {
                r = await crea.broadcast.transferToVestingAsync(wif, creator, user, cgy);

                if (r) {
                    console.log(r);
                }
            }

        }
    };

    fn();
}

program
    .version(util.getVersion())
    .description('Crea Account Tools')
    .option('-n, --node <node>', 'Set node to connect', setOptions);

program.command('create <creator> <wif> <user>')
    .description('Create new Blockchain account')
    .action(function (creator, wif, user) {

        let fn = async function () {

            try {
                let password = 'P' + crea.formatter.createSuggestedPassword();
                let keys = crea.auth.getPrivateKeys(user, password, ['active', 'posting', 'owner', 'memo']);

                await createAccount(creator, wif, user, keys['activePubkey'], keys['postingPubkey'], keys['memoPubkey'], keys['ownerPubkey'], '', null);

                console.log('Username:', user);
                console.log('Password:', password);
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        };

        fn();

    });

program.command('create-with <creator> <wif> <user> <active> <posting> <memo> <owner> <json>')
    .description('Create new Blockchain account with specific parameters')
    .option('-c, --cgy <cgy>', 'Transfer CGY to new account')
    .action(function (creator, wif, user, active, posting, memo, owner, json, cmd) {

        let fn = async function () {
            try {
                await createAccount(creator, wif, user, active, posting, memo, owner, json, cmd.cgy)
            } catch (e) {
                console.error(e);
                process.exit(1)
            }
        };

        fn();

    });

program.command('create-with-password <creator> <wif> <user> <password>')
    .description('Create new Blockchain account using given password.')
    .action(function (creator, wif, user, password) {
        let fn = async function () {

            try {
                let keys = crea.auth.getPrivateKeys(user, password, ['active', 'posting', 'owner', 'memo']);

                await createAccount(creator, wif, user, keys['activePubkey'], keys['postingPubkey'], keys['memoPubkey'], keys['ownerPubkey'], '', null);

                console.log('Account successfully created:', user)
            } catch (e) {
                console.error(e);
                process.exit(1);
            }

        };

        fn();
    });
program.parse(process.argv);