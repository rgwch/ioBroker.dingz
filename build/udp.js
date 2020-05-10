"use strict";
/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 * Copyright (c) 2020 by G. Weirich
 * License: See LICENSE
 *
 * UDP Discovery of Dingz
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const dgram = require("dgram");
const events_1 = require("events");
class UDP extends events_1.EventEmitter {
    constructor(log) {
        super();
        this.devices = new Map();
        this.server = dgram.createSocket("udp4");
        this.server.on("error", err => {
            log.error("UDP listener error " + err);
        });
        this.server.on("message", (msg, rinfo) => {
            log.info("found " + msg + " from " + rinfo.address);
            if (msg.length == 8) {
                const mac = msg.subarray(0, 5);
                if (!this.devices.has(mac.toString())) {
                    const dingzID = msg[6];
                    if (dingzID == 108) {
                        this.emit("dingz", mac, rinfo.address);
                        this.devices.set(mac.toString(), rinfo);
                    }
                }
            }
        });
    }
    listen() {
        this.server.bind(7979);
    }
    stop() {
        this.server.close();
    }
}
exports.UDP = UDP;
