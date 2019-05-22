#! /usr/bin/env node

let crea = require('@creativechain-fdn/crea-js');
let program = require('commander');
let { execFile } = require('child_process');
let util = require('../src/util');

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
    .description('Creary Blockchain Tools')
    .option('-n, --node <node>', 'Set node to connect', setOptions);

program.command('suggest-password')
    .description('Suggest new password')
    .action(function () {
        console.log('P' + crea.formatter.createSuggestedPassword())
    });

program.command('create-role-password <user> <password> <role>')
    .description('Create password role give user and master password')
    .option('-p, --public', 'Show public key')
    .action(function (user, password, role, cmd) {
        let privKeys = crea.auth.getPrivateKeys(user, password, [role]);

        if (cmd.public) {
            console.log(privKeys[role+'Pubkey']);
        } else {
            console.log(privKeys[role]);
        }
    });

//SEARCHER COMMAND
program.command('scan-blocks <block>')
    .description('Scan Creary blockchain blocks')
    .option('-c, --comment-script <script>', 'Script file to execute when detect a comment')
    .option('-r, --reblog-script <script>', 'Script file to execute when detect a reblog')
    .action(function (block, cmd) {

        block = parseInt(block);
        let fn = async function () {

            while (true) {

                try {
                    let p = await crea.api.getBlockAsync(block);

                    if (p) {

                        let txs = p.transactions;

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

                                    if (cmd.commentScript) {
                                        if (!opData.parent_author) {
                                            //Only comments, no responses

                                            let fileScript = cmd.commentScript;
                                            let args = [author, permlink];
                                            execFile(fileScript, args, function (err, stderr, stdout) {
                                                console.log(stderr)
                                            })
                                        }
                                    }
                                } else if (opType === 'custom_json') {
                                    let jsonData = JSON.parse(opData.json);
                                    if (opData.id === 'follow') {
                                        if (jsonData[0] === 'reblog') {
                                            let fileScript = cmd.reblogScript;
                                            if (fileScript) {
                                                let reblogData = jsonData[1];

                                                let args = [reblogData.author, reblogData.permlink, reblogData.account];
                                                console.log(fileScript, args);
                                                execFile(fileScript, args, function (err, stderr, stdout) {
                                                    console.log(stderr)
                                                })
                                            }

                                        }
                                    }
                                }
                            });
                        });

                        block++;
                    } else {
                        util.sleep(3000);
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        };

        fn();

    });

program.parse(process.argv);