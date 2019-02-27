#! /usr/bin/env node

let crea = require('@creativechain-fdn/crea-js');
let program = require('commander');
let { execFile } = require('child_process');
let { Asset } = require('../src/amount');
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



let fileScript;
function setScript(script) {
    fileScript = script;
}

program
    .version(util.getVersion())
    .description('Creary Exchange Tools')
    .option('-n, --node <node>', 'Set node to connect', setOptions)
    .option('-s, --script <script>', 'Command to execute', setScript);

program.command('notify <username>')
    .description('Execute a script when detect account balance movement')
    .option('-b, --block <blocknum>', 'Scan since block')
    .option('-i, --only-inputs', 'Notify only inputs transactions')
    .action(function (username, cmd) {

        let fn = async function() {
            let sinceBlock = 0;
            let lastBlock;
            while (true) {
                let props = await crea.api.getDynamicGlobalPropertiesAsync();

                if (lastBlock) {
                    let confirmedBlock = props.last_irreversible_block_num;
                    if (sinceBlock > confirmedBlock) {
                        console.log('Waiting for new confirmed block...');
                        util.sleep(3000);
                        continue;
                    }

                } else {
                    sinceBlock = cmd.block ? cmd.block : props.last_irreversible_block_num;
                }

                let block = await crea.api.getBlockAsync(sinceBlock);

                if (block) {
                    lastBlock = sinceBlock;

                    let txs = block.transactions;

                    console.log('Block', sinceBlock, '(' + block.block_id + ')', 'with', txs.length, ' operations');
                    txs.forEach(function (tx) {
                        let operations = tx.operations;

                        operations.forEach(function (op) {
                            let opType = op[0];
                            let opData = op[1];

                            console.log('Op:', opType);
                            if (opType === 'transfer') {
                                let amount = Asset.parseString(opData.amount);
                                let memo = opData.memo;

                                let args = [sinceBlock, block.block_id, tx.transaction_id, opData.from, opData.to, amount.amount, amount.asset.symbol, memo];

                                if (cmd.onlyInputs) {
                                    if (opData.to === username ) {

                                        execFile(fileScript, args, function (err, stderr, stdout) {
                                            console.log(err, stderr, stdout)
                                        })
                                    }
                                } else if (opData.from === username || opData.to === username ) {
                                    execFile(fileScript, args, function (err, stderr, stdout) {
                                        console.log(stderr)
                                    })
                                }

                            }

                        })

                    });

                    sinceBlock++;
                }

            }
        };

        fn();
    });


program.parse(process.argv);