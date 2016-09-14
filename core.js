'use strict';
var PokemonGO = require('pokemon-go-node-api');
var EventEmitter = require('events');
var _ = require('lodash');
/////// /////// ///////
var a = new PokemonGO.Pokeio();
var botEmitter = new EventEmitter();
/////// /////// ///////
botEmitter.on('init', function(username, password, location, provider) {
    a.init(username, password, location, provider, function(err) {
        try {
            botEmitter.emit('init:complete', a.playerInfo);
        } catch (err) {
            botEmitter.emit('ERROR', 'init', err);
        }
    });
});
botEmitter.on('GetProfile', function() {
    a.GetProfile(function(err, profile) {
        try {
            botEmitter.emit('GetProfile:complete', profile);
        } catch (err) {
            botEmitter.emit('ERROR', 'GetProfile', err);
        }
    });
});
botEmitter.on('Heartbeat', function() {
    a.Heartbeat(function(err, hb) {
        try {
            if (hb && hb.cells && hb.cells.length > 0) {
                var noFort = true;
                var fortsAvailable = [];
                hb.cells.forEach(function(cell, key) {
                    if (cell.Fort && cell.Fort.length > 0) {
                        noFort = false;
                        cell.Fort.forEach(function(fort, key) {
                            if (fort && fort.FortType == 1 && fort.Enabled) {
                                fortsAvailable.push(fort);
                            }
                        });
                    }
                });
                botEmitter.emit('Heartbeat:complete', fortsAvailable);
                if (noFort) {
                    botEmitter.emit('Heartbeat:warning', 'no forts');
                }
            } else {
                botEmitter.emit('Heartbeat:warning', 'no cells');
            }
        } catch (err) {
            botEmitter.emit('ERROR', 'Heartbeat', err);
        }
    });
});
botEmitter.on('GetFortDetails', function(fort, FortId) {
    var last = false;
    a.GetFortDetails(fort.FortId, fort.Latitude, fort.Longitude, function(err, fortDetails) {
        try {
            if (fortDetails) {
                var obj = {
                    name: fortDetails.name,
                    fortId: fortDetails.fort_id,
                    latitude: fortDetails.latitude,
                    longitude: fortDetails.longitude
                };
                if (fort.FortId === FortId) {
                    last = true;
                }
                botEmitter.emit('GetFortDetails:complete', obj, last);
            } else {
                console.log('something wrong', fortDetails);
            }
        } catch (err) {
            botEmitter.emit('ERROR', 'GetFortDetails', err);
        }
    });
});
botEmitter.on('GetInventory', function() {
    a.GetInventory(function(err, inventory) {
        try {
            var myBag = [];
            inventory.inventory_delta.inventory_items.forEach(function(value, key) {
                if (value.inventory_item_data.item) {
                    myBag.push(value.inventory_item_data.item);
                }
            });
            botEmitter.emit('GetInventory:complete', myBag);
        } catch (err) {
            botEmitter.emit('ERROR', 'GetInventory', err);
        }
    });
});
botEmitter.on('GetFort', function(fort) {
    a.GetFort(fort.fortId, fort.latitude, fort.longitude, function(err, fortResponse) {
        try {
            if (fortResponse) {
                botEmitter.emit('GetFort:complete', fortResponse);
            }
        } catch (err) {
            botEmitter.emit('ERROR', 'GetInventory', err);
        }
    });
});
botEmitter.on('itemInterpreter', function(item) {
    var itemInterpretated = _.find(a.itemlist, function(itemFromList) {
        return itemFromList.id === item.item_id;
    });
    if (itemInterpretated) {
        item.name = itemInterpretated.name;
    } else {
        item.name = item.id;
    }
    botEmitter.emit('itemInterpreter:complete', item);
});
module.exports = botEmitter;;
