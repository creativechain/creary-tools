#! /usr/bin/env node

let crea = require('@creativechain-fdn/crea-js');
let program = require('commander');
let { execFile } = require('child_process');
let { Mutex } = require('async-mutex');
let fs = require('fs');
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

function readMetricFile(file, defaultVal) {
    if (fs.existsSync(file)) {
        defaultVal = fs.readFileSync(file);
        defaultVal = JSON.parse(defaultVal);
    }

    return defaultVal;
}

function writeMetricFile(data, file) {
    fs.writeFileSync(file, JSON.stringify(data));
}

program.command('scan-metrics <block>')
    .description('Scan Metrics Creary blockchain')
    .action(function (block, cmd) {

        console.log('Reading files...')
        let publications = readMetricFile('publications.json', []);
        let comments = readMetricFile('comments.json', []);
        let reblogs = readMetricFile('reblogs.json', []);
        let likes = readMetricFile('likes.json', [0]);
        let unlikes = readMetricFile('unlikes.json', [0]);
        let usedTags = readMetricFile('usedTags.json', {});

        let addTags = function (tags) {

            if (tags && Array.isArray(tags)) {
                tags.forEach( tag => {
                    if (usedTags[tag]) {
                        usedTags[tag] += 1;
                    } else {
                        usedTags[tag] = 1;
                    }
                })
            }

        };
        setInterval( async _ => {
            try {
                writeMetricFile(publications, 'publications.json');
                console.log('Publications:', publications.length);
            } catch (e) {
                console.error('Can not write file publications');
            }

            try {
                writeMetricFile(comments, 'comments.json');
                console.log('Comments:', comments.length);
            } catch (e) {
                console.error('Can not write file comments');
            }

            try {
                writeMetricFile(reblogs, 'reblogs.json');
                console.log('Reblogs:', reblogs.length);
            } catch (e) {
                console.error('Can not write file reblogs');
            }

            try {
                writeMetricFile(likes, 'likes.json');
                console.log('Likes:', likes[0]);
            } catch (e) {
                console.error('Can not write file likes');
            }

            try {
                writeMetricFile(unlikes, 'unlikes.json');
                console.log('Unlikes:', unlikes[0]);
            } catch (e) {
                console.error('Can not write file unlikes');
            }

            try {
                writeMetricFile(usedTags, 'usedTags.json');
                console.log('UsedTags:', usedTags.length);
            } catch (e) {
                console.error('Can not write file usedTags');
            }

        }, 60e3);

        if (!block) {
            block = 0;
        } else {
            block = parseInt(block);
        }
        let fn = async function () {

            console.log('Scanning...');
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
                                    let perma = `${author}/${permlink}`;
                                    if (!opData.parent_author) {
                                        //This is a publciation
                                        if (!publications.includes(permlink)) {
                                            publications.push(perma);
                                        }

                                        try {
                                            //Count tags
                                            let metadata = JSON.parse(opData.json_metadata);
                                            addTags(metadata.tags);
                                        } catch (e) {
                                            console.error('Can not parse metadata');
                                        }

                                    } else {
                                        //This is a comment
                                        if (!comments.includes(permlink)) {
                                            comments.push(perma);
                                        }
                                    }
                                } else if (opType === 'custom_json') {
                                    let jsonData = JSON.parse(opData.json);
                                    if (opData.id === 'follow') {
                                        if (jsonData[0] === 'reblog') {
                                            let fileScript = cmd.reblogScript;
                                            if (fileScript) {
                                                let reblogData = jsonData[1];
                                                let reblogId = `${reblogData.author}/${reblogData.permlink}/${reblogData.account}`;
                                                if (!reblogs.includes(reblogId)) {
                                                    reblogs.push(reblogId);
                                                }
                                            }

                                        }
                                    }
                                } else if (opType === 'vote') {
                                    if (opData.weight > 0) {
                                        //Like
                                        likes[0] += 1;
                                    } else if (opData.weight < 0) {
                                        //Unlike
                                        unlikes[0] += 1;
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