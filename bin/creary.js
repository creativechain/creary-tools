#! /usr/bin/env node

let crea = require('@creativechain-fdn/crea-js');
let program = require('commander');
let mysql = require('mysql');

function sleep(delay) {
    let start = new Date().getTime();
    while (new Date().getTime() < start + delay);
}

function createAuth(key) {
    return {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [
            [key, 1]
        ]
    }
}

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
    .version('0.0.1')
    .description('Creary Blockchain Tools')
    .option('-n, --node <node>', 'Set node to connect', setOptions);

//ACCOUNT CREATION COMMAND
program.command('new-account <creator> <wif> <user> <active> <posting> <memo> <owner> <json> <cgy>')
    .description('Create new Blockchain account')
    .action(function (creator, wif, user, active, posting, memo, owner, json, cgy) {

        let fn = async function () {

            let props = await crea.api.getChainPropertiesAsync();
            let fee = props.account_creation_fee;

            //console.log(creator, wif, user, active, posting, memo, owner, json, fee);
            let r = await crea.broadcast.accountCreateAsync(wif, fee, creator, user, createAuth(owner),
                createAuth(active), createAuth(posting), memo, json);

            if (r) {
                console.log(r);

                r = await crea.broadcast.transferToVestingAsync(wif, creator, user, cgy);

                if (r) {
                    console.log(r);
                }
            }

        };

        fn();

    });

program.command('suggest-password')
    .description('Suggest new password')
    .action(function () {
        console.log('P' + crea.formatter.createSuggestedPassword())
    });

program.command('create-role-password <user> <password> <role>')
    .description('Create password role give user and master password')
    .option('--p, --public', 'Show public password')
    .action(function (user, password, role, cmd) {
        let privKeys = crea.auth.getPrivateKeys(user, password, [role]);

        if (cmd.public) {
            console.log(privKeys[role+'Pubkey']);
        } else {
            console.log(privKeys[role]);
        }
    });

program.command('create-account-with-password <creator> <wif> <user> <password>')
    .description('Create new blockchain account using given password.')
    .action(function (creator, wif, user, password) {
        let fn = async function () {

            try {
                let props = await crea.api.getChainPropertiesAsync();
                let fee = props.account_creation_fee;

                let roles = ['posting', 'active', 'owner', 'memo'];

                let privKeys = crea.auth.getPrivateKeys(user, password, roles);

                let r = await crea.broadcast.accountCreateAsync(wif, fee, creator, user, createAuth(privKeys['ownerPubkey']),
                    createAuth(privKeys['activePubkey']), createAuth(privKeys['postingPubkey']), privKeys['memoPubkey'], '');

                console.log('Account successfully created:', user)
            } catch (e) {
                console.error(e);
                throw e;
            }

        };

        fn();
    });

program.command('set-witness <user> <wif> <url> <sigkey> <props>')
    .description('Create or update a witness account.')
    .action(function (user, wif, url, sigkey, props) {

        let fn = async function () {
            try {
                let r = await crea.broadcast.witnessUpdateAsync(wif, user, url, sigkey, JSON.parse(props), '0.000 CREA');
                console.log('Witness successfully updated:', user)
            } catch (e) {
                console.error(e);
                process.exit(1)
            }
        };

        fn();
    });

//SEARCHER COMMAND
program.command('store-blocks <host> <user> <password> <database> <block>')
    .description('Store Creary blockchain blocks in a MySQL Database')
    .action(function (host, user, password, database, block) {

        block = parseInt(block);
        let fn = async function () {

            while (true) {

                try {
                    let p = await crea.api.getBlockAsync(block);

                    if (p) {

                        let txs = p.transactions;
                        let timestamp = new Date(p.timestamp);

                        console.log('Block', block, '(' + p.block_id + ')', 'with', txs.length, ' operations');
                        txs.forEach(function (tx) {
                            let operations = tx.operations;

                            operations.forEach(function (op) {
                                let opType = op[0];
                                let opData = op[1];

                                console.log('Op:', opType);
                                if (opType === 'comment') {

                                    let permlink = opData.permlink;
                                    let author = opData.author;
                                    console.log('Processing', author, permlink);
                                    if (!opData.parent_author) {

                                        try {
                                            opData.metadata = JSON.parse(opData.json_metadata);
                                        } catch (e) {
                                            console.error('Failed parsing metadata');
                                        }

                                        let mysqlConnection = mysql.createConnection({host, user, password, database});
                                        mysqlConnection.connect(function (err) {
                                            if (err) {
                                                console.log(err);
                                                throw err;
                                            }
                                        });

                                        mysqlConnection.query('SELECT * FROM crea_content WHERE author = ? AND permlink = ?', [author, permlink], function (error, results, fields) {
                                            if (error) {
                                                console.log(error);
                                            } else if (results) {
                                                let query;
                                                let params = [];
                                                if (results.length) {
                                                    //Modify
                                                    console.log('Updating registry', author, permlink);
                                                    query = 'UPDATE crea_content SET title = ?, license = ?, adult = ?, description = ?, tags = ? WHERE author = ? AND permlink = ?;';
                                                } else {
                                                    query = 'INSERT INTO crea_content (author, permlink, title, license, adult, description, tags, creation_date, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                                    params.push(author);
                                                    params.push(permlink);
                                                }

                                                params.push(opData.title);

                                                if (opData.metadata) {
                                                    params.push(opData.metadata.license);
                                                    params.push(opData.metadata.adult ? 1: 0);
                                                    params.push(opData.metadata.description);

                                                    try {
                                                        params.push(JSON.stringify(opData.metadata.tags));
                                                    } catch (e) {
                                                        console.log('Fail encoding tags');
                                                        params.push('[]')
                                                    }
                                                } else {
                                                    params.push(-1);
                                                    params.push(0);
                                                    params.push('');
                                                    params.push('');
                                                }

                                                params.push(timestamp.getTime());
                                                params.push('');

                                                mysqlConnection.query(query, params, function (err, results, fields) {
                                                    if (err) {
                                                        console.error(err);
                                                    }
                                                    mysqlConnection.end();

                                                });
                                            }
                                        });


                                    }
                                }
                            });
                        });

                        block++;
                    } else {
                        sleep(3000);
                    }


                } catch (e) {
                    console.log(e);
                }
            }
        };

        fn();

    });

program.parse(process.argv);