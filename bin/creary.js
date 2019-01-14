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

function setOptions() {
    let apiOptions = {
        nodes: ["https://node1.creary.net"],
        addressPrefix: 'CREA',
        chainId: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    crea.api.setOptions(apiOptions);

    crea.config.set('chain_id', apiOptions.chainId);
    crea.config.set('address_prefix', apiOptions.addressPrefix);
}

setOptions();

program
    .version('0.0.1')
    .description('Creary Blockchain Tools');

//ACCOUNT CREATION COMMAND
program.command('new-account <creator> <wif> <user> <active> <posting> <memo> <owner> <json> <fee> <cgy>')
    .description('Create new Blockchain account')
    .action(function (creator, wif, user, active, posting, memo, owner, json, fee, cgy) {

        let fn = async function () {

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

//SEARCHER COMMAND
program.command('store-blocks <host> <user> <password> <database> <block>')
    .description('Store Creary blockchain blocks in a MySQL Database')
    .action(function (host, user, password, database, block) {

        block = parseInt(block);
        let fn = async function () {
            let mysqlConnection = mysql.createConnection({host, user, password, database});

            mysqlConnection.connect();

            while (true) {

                try {
                    let p = await crea.api.getBlockAsync(block);

                    let onDbConnected = function () {
                        if (p) {

                            let txs = p.transactions;
                            let timestamp = new Date(p.timestamp);

                            console.log('Block', block, 'with', txs.length, ' operations' );
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
                                                    });
                                                }
                                            })
                                        }
                                    }
                                });
                            });

                            block++;
                        } else {
                            sleep(3000);
                        }
                    };

                    mysqlConnection.ping(function (err) {
                        if (err) {
                            mysqlConnection.destroy();
                            mysqlConnection = mysql.createConnection({host, user, password, database});
                            mysqlConnection.connect();
                            onDbConnected();
                        } else {
                            onDbConnected();
                        }
                    });


                } catch (e) {

                }
            }
        };

        fn();

    });

program.parse(process.argv);


