'use strict';
//Requires
var PokemonGO = require('pokemon-go-node-api');
var EventEmitter = require('events');
var _ = require('lodash');
var util = require('util');
//
var pokeio = new PokemonGO.Pokeio();
var Kbot = function() {};
util.inherits(Kbot, EventEmitter);
/////// /////// ///////
Kbot.prototype.init = function(username, password, location, provider) {
    var self = this;
    pokeio.init(username, password, location, provider, function(err) {
        try {
            self.emit('init:complete', pokeio.playerInfo);
        } catch (err) {
            self.emit('ERROR', 'init', err);
        }
    });
};
Kbot.prototype.getProfile = function() {
    var self = this;
    pokeio.GetProfile(function(err, profile) {
        try {
            self.emit('getProfile:complete', profile);
        } catch (err) {
            self.emit('ERROR', 'getProfile', err);
        }
    });
};
Kbot.prototype.heartbeat = function() {
    var self = this;
    pokeio.Heartbeat(function(err, hb) {
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
                self.emit('heartbeat:complete', fortsAvailable);
                if (noFort) {
                    self.emit('heartbeat:warning', 'no forts');
                }
            } else {
                self.emit('heartbeat:warning', 'no cells');
            }
        } catch (err) {
            self.emit('ERROR', 'heartbeat', err);
        }
    });
};
Kbot.prototype.getFortDetails = function(fort, FortId) {
    var self = this;
    var last = false;
    pokeio.GetFortDetails(fort.FortId, fort.Latitude, fort.Longitude, function(err, fortDetails) {
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
                self.emit('getFortDetails:complete', obj, last);
            } else {
                console.log('something wrong', fortDetails);
            }
        } catch (err) {
            self.emit('ERROR', 'getFortDetails', err);
        }
    });
};
Kbot.prototype.getFort = function(fort) {
    var self = this;
    pokeio.GetFort(fort.fortId, fort.latitude, fort.longitude, function(err, fortResponse) {
        try {
            if (fortResponse) {
                self.emit('getFort:complete', fortResponse);
            }
        } catch (err) {
            self.emit('ERROR', 'getInventory', err);
        }
    });
};
Kbot.prototype.itemInterpreter = function(item) {
    var self = this;
    var itemInterpretated = _.find(pokeio.itemlist, function(itemFromList) {
        return itemFromList.id === item.item_id;
    });
    if (itemInterpretated) {
        item.name = itemInterpretated.name;
    } else {
        item.name = item.id;
    }
    self.emit('itemInterpreter:complete', item);
};
// botEmitter.on('GetInventory', function() {
//     a.GetInventory(function(err, inventory) {
//         try {
//             var myBag = [];
//             inventory.inventory_delta.inventory_items.forEach(function(value, key) {
//                 if (value.inventory_item_data.item) {
//                     myBag.push(value.inventory_item_data.item);
//                 }
//             });
//             botEmitter.emit('GetInventory:complete', myBag);
//         } catch (err) {
//             botEmitter.emit('ERROR', 'GetInventory', err);
//         }
//     });
// });
module.exports = Kbot;
