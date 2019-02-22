#! /usr/bin/env node

let crea = require('@creativechain-fdn/crea-js');
let program = require('commander');
let util = require('../src/util');

function setOptions(node) {
    node = node ? node : 'https://crea.owldevelopers.site';
    let apiOptions = {
        nodes: [node],
        addressPrefix: 'CREA',
        chainId: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    crea.api.setOptions(apiOptions);

    crea.config.set('chain_id', apiOptions.chainId);
    crea.config.set('address_prefix', apiOptions.addressPrefix);
}

function createAccount(creator, wif, user, active, posting, memo, owner) {
    let fn = async function () {
        let fee = await getCreationFee();

        await crea.broadcast.accountCreateAsync(wif, fee, creator, user, util.createAuth(owner),
            util.createAuth(active), util.createAuth(posting), memo, program.metadata ? program.metadata : '');

        console.log('Account created successfully!');
        if (program.cgy) {
            console.log('Sending', program.cgy, 'to', user, '...');
            await crea.broadcast.transferToVestingAsync(wif, creator, user, program.cgy);
            console.log('Transferred', program.cgy, 'to', user, '!');

        }
    };

    fn();
}

function getCreationFee() {

    let fn = async function () {
        let props = await crea.api.getChainPropertiesAsync();
        return  props.account_creation_fee;
    };

    return fn();
}

program
    .version(util.getVersion())
    .description('Crea Account Tools')
    .option('-n, --node <node>', 'Set node to connect', setOptions)
    .option('-c, --cgy <cgy>', 'Transfer CGY to new account')
    .option('-m, --metadata <metadata>', 'JSON string metadata for user');

program.command('create <creator> <wif> <user>')
    .description('Create new Blockchain account')
    .action(function (creator, wif, user) {

        let fn = async function () {

            try {
                let password = 'P' + crea.formatter.createSuggestedPassword();
                let keys = crea.auth.getPrivateKeys(user, password, ['active', 'posting', 'owner', 'memo']);

                await createAccount(creator, wif, user, keys['activePubkey'], keys['postingPubkey'], keys['memoPubkey'], keys['ownerPubkey']);

                console.log('Username:', user);
                console.log('Password:', password);
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        };

        fn();

    });

program.command('create-with <creator> <wif> <user> <active> <posting> <memo> <owner>')
    .description('Create new Blockchain account with specific parameters')

    .action(function (creator, wif, user, active, posting, memo, owner) {

        let fn = async function () {
            try {
                await createAccount(creator, wif, user, active, posting, memo, owner);
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

                await createAccount(creator, wif, user, keys['activePubkey'], keys['postingPubkey'], keys['memoPubkey'], keys['ownerPubkey']);

            } catch (e) {
                console.error(e);
                process.exit(1);
            }

        };

        fn();
    });

program.command('change-password <user> <wif>')
    .description('Change account keys')
    .option('-p, --password <password>', 'New password of account.')
    .option('-m, --metadata <metadata>', 'JSON string metadata for account')
    .action(function (user, wif, cmd) {

        let fn = async function () {

            try {

                let password = cmd.password ? cmd.password : 'P' + crea.formatter.createSuggestedPassword();
                let keys = crea.auth.getPrivateKeys(user, password, ['active', 'posting', 'owner', 'memo']);

                await crea.broadcast.accountUpdateAsync(wif, user, util.createAuth(keys['ownerPubkey']), util.createAuth(keys['activePubkey']),
                    util.createAuth(keys['postingPubkey']), keys['memoPubkey'], cmd.metadata ? cmd.metadata : '');

                console.log('Username:', user);
                console.log('Password:', password);
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        };

        fn();

    });

program.parse(process.argv);