'use strict';
//latitude: 45.668770,
//longitude: 9.211322
var botEmitter = require('./core.js');
var store = require('json-fs-store')('./storage');
var Table = require('cli-table');
var loader = require('cli-loader')();
var inquirer = require('inquirer');
var _ = require('lodash');
var clc = require('cli-color');
var readline = require('readline');
var geolib = require('geolib');
/////// /////// ///////
var notice = clc.blue;
var warning = clc.yellow;
var forts = [];
// instantiate
var table = new Table({
    head: ['NAME', 'DISTANCE'],
    colWidths: [30, 25]
});
var rl;
var coords;
/////// /////// ///////
function asciiArt() {
    //http://patorjk.com/software/taag/#p=display&h=0&v=0&f=Nancyj&t=k-Bot
    console.log('\n');
    console.log('dP                 888888ba             dP   ');
    console.log('88                 88    \`8b            88   ');
    console.log('88  .dP           a88aaaa8P\' .d8888b. d8888P ');
    console.log('88888\"   88888888  88   \`8b. 88\'  \`88   88 ');
    console.log('88  \`8b.           88    .88 88.  .88   88   ');
    console.log('dP   \`YP           88888888P \`88888P\'   dP   \n\n');
};
//asciiArt();
function initPrompt() {
    var history;
    if (rl) {
        history = rl.history;
        rl.close();
    }
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    if (history) {
        rl.history = history;
    };
    rl.setPrompt('kappoo-bot> ');
    rl.on('line', (line) => {
        switch (true) {
            case line.startsWith('quit'):
            case line.startsWith('exit'):
                rl.close();
                process.exit(0);
                break;
            case line.startsWith('ls'):
            case line.startsWith('list'):
                console.log(table.toString());
                rl.prompt();
                break;
            case line.startsWith('get'):
                getFort();
                break;
            case line.startsWith('logout'):
                logout();
                break;
            case line.startsWith('help'):
                console.log('Available commands:');
                console.log('\tquit/exit' + ' '.repeat(31) + 'Exit from bot.');
                console.log('\tlist' + ' '.repeat(36) + 'List available Pokestop.');
                console.log('\tget-fort' + ' '.repeat(32) + 'Get Pokestop items.');
                console.log('\thelp' + ' '.repeat(36) + 'List available commands.');
                rl.prompt();
                break;
            default:
                rl.prompt();
        }
    });
    rl.on('SIGCONT', () => {
        console.log('Caught SIGCONT.');
        rl.prompt();
    });
    rl.on('SIGTSTP', () => {
        console.log('Caught SIGTSTP.');
        rl.prompt();
    });
    rl.on('SIGINT', () => {
        rl.question('Are you sure you want to exit? ', (answer) => {
            if (answer.match(/^y(es)?$/i)) {
                rl.close();
                process.exit(0);
            }
        });
    });
    rl.prompt();
}
botEmitter.on('ERROR', function(who, err) {
    console.log(clc.red.bold('ERROR [' + who + ']'));
    console.log(clc.red(err));
});
botEmitter.on('init:complete', function(playerInfo) {
    console.log(notice('Current location: ' + playerInfo.locationName));
    coords = {
        lat: playerInfo.latitude,
        lon: playerInfo.longitude
    }
    console.log(notice('Current coords: : ' + playerInfo.latitude + ', ' + playerInfo.longitude));
    botEmitter.emit('GetProfile');
});
botEmitter.on('GetProfile:complete', function(profile) {
    console.log(notice('Username: ' + profile.username));
    botEmitter.emit('Heartbeat');
});
botEmitter.on('Heartbeat:warning', function(reason) {
    console.log(warning('WARINIG: ' + reason + '. Retrying...'));
    botEmitter.emit('Heartbeat');
});
botEmitter.on('Heartbeat:complete', function(fortsAvailable) {
    console.log(notice('Heartbeat complete. Looking for available Pokestops...'));
    var rnd1 = 0;
    var rnd2 = 0;
    var rnd3 = 0;
    var rndTot = 0;
    _.remove(fortsAvailable, function(fort) {
        var distance = geolib.getDistance({
            latitude: coords.lat,
            longitude: coords.lon
        }, {
            latitude: fort.Latitude,
            longitude: fort.Longitude
        });
        return distance > 40;
    });
    fortsAvailable.forEach(function(fort, key) {
        rnd1 = parseInt(Math.random() * 1000);
        rnd2 = parseInt(Math.random() * 5 + 2);
        rnd3 = parseInt(Math.random() * 100 + 100);
        rndTot = rndTot + (rnd1 * rnd2) + rnd3;
        setTimeout(function() {
            console.log('(' + (key + 1) + '/' + fortsAvailable.length + ') ');
            botEmitter.emit('GetFortDetails', fort, _.last(fortsAvailable).FortId);
        }, rndTot);
    });
});
botEmitter.on('GetFortDetails:complete', function(fort, last) {
    var distance = geolib.getDistance({
        latitude: coords.lat,
        longitude: coords.lon
    }, {
        latitude: fort.latitude,
        longitude: fort.longitude
    });
    forts.push(fort);
    table.push(
        [fort.name, distance + 'm']);
    if (last) {
        console.log(clc.underline('\nPOKESTOPS'));
        console.log(table.toString());
        initPrompt();
    }
});
botEmitter.on('GetFort:complete', function(fortResponse) {
    loader.stop();
    // console.log('fortResponse:\n', JSON.stringify(fortResponse, null, '  '));
    if (fortResponse.result === 1) {
        console.log('Items awarded:');
        fortResponse.items_awarded.forEach(function(item) {
            botEmitter.emit('itemInterpreter', item);
        });
    } else if (fortResponse.result === 2) {
        console.log('Pokestop too far!');
    } else if (fortResponse.result === 3) {
        console.log('Pokestop used');
    } else if (fortResponse.result === 4) {
        console.log('Bag full');
        console.log('Bye Bye!');
        process.exit();
    }
    initPrompt();
});
botEmitter.on('itemInterpreter:complete', function(item) {
    console.log('(' + item.item_id + ')' + item.name + ' x' + item.item_count);
});

function getFort() {
    var choices = [];
    forts.forEach(function(fort) {
        choices.push(fort.name);
    });
    var questions = [{
        type: 'list',
        name: 'fort',
        message: 'Select Pokestop',
        choices: choices,
        filter: function(val) {
            return _.find(forts, function(fort) {
                return fort.name === val;
            });
        }
    }];
    inquirer.prompt(questions).then(function(answers) {
        loader.start();
        botEmitter.emit('GetFort', answers.fort);
    });
};

function logout() {
    store.remove('setup', function(err) {
        try {
            load();
        } catch (err) {
            botEmitter.emit('ERROR', 'save', err);
        }
    });
}

function save(username, password, location, provider) {
    store.add({
        id: 'setup',
        data: {
            username: username,
            password: password,
            location: location,
            provider: provider
        }
    }, function(err) {
        try {
            load();
        } catch (err) {
            botEmitter.emit('ERROR', 'save', err);
        }
    });
}

function load() {
    store.load('setup', function(err, data) {
        try {
            if (!data || !data.data || !data.data.username || !data.data.password || !data.data.location || !data.data.provider) {
                var questions = [{
                    type: 'input',
                    name: 'username',
                    message: 'Username:'
                }, {
                    type: 'password',
                    name: 'password',
                    message: 'Password:'
                }, {
                    type: 'input',
                    name: 'latitude',
                    message: 'Latitude:',
                    validate: function(value) {
                        var valid = !isNaN(parseFloat(value));
                        return valid || 'Please enter a valid latitude';
                    },
                    filter: Number
                }, {
                    type: 'input',
                    name: 'longitude',
                    message: 'Longitude:',
                    validate: function(value) {
                        var valid = !isNaN(parseFloat(value));
                        return valid || 'Please enter a valid longitude';
                    },
                    filter: Number
                }, {
                    type: 'list',
                    name: 'provider',
                    message: 'Provider:',
                    choices: ['Google', 'PTC'],
                    filter: function(val) {
                        return val.toLowerCase();
                    }
                }];
                inquirer.prompt(questions).then(function(answers) {
                    var location = {
                        "type": "coords",
                        "coords": {
                            "latitude": answers.latitude,
                            "longitude": answers.longitude
                        }
                    };
                    save(answers.username, answers.password, location, answers.provider);
                });
            } else {
                var loadedData = data.data;
                botEmitter.emit('init', loadedData.username, loadedData.password, loadedData.location, loadedData.provider);
            }
        } catch (err) {
            botEmitter.emit('ERROR', 'load', err);
        }
    });
}
load();
/////// /////// ///////
//
// botEmitter.on('GetInventory:complete', function(myBag) {
//     console.log('myBag', myBag);
// });
//
//
// // if (value.inventory_item_data.item && value.inventory_item_data.item.item_id === 1) {
// //     console.log(value.inventory_item_data.item.count + ' pokeball');
// // } else if (value.inventory_item_data.item && value.inventory_item_data.item.item_id === 2) {
// //     console.log(value.inventory_item_data.item.count + ' superball');
// // } else if (value.inventory_item_data.item && value.inventory_item_data.item.item_id === 3) {
// //     console.log(value.inventory_item_data.item.count + ' ultraball');
// // } else if (value.inventory_item_data.item && value.inventory_item_data.item.item_id === 4) {
// //     console.log(value.inventory_item_data.item.count + ' masterball');
// // }
