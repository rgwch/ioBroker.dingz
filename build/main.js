"use strict";
/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 * Copyright (c) 2020 by G. Weirich
 * License: See LICENSE
 *
 * Adapter templated created with @iobroker/create-adapter v1.24.2
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = require("@iobroker/adapter-core");
const node_fetch_1 = require("node-fetch");
const udp_1 = require("./udp");
// That's the only supported API as of now, AFAIK
const API = "/api/v1/";
class Dingz extends utils.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: "dingz" }));
        this.interval = 30;
        this.on("ready", this.onReady.bind(this));
        // this.on("stateChange", this.onStateChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    findDingz() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const udp = new udp_1.UDP(this.log);
                udp.on("dingz", (mac, address) => {
                    this.log.info("found Dingz at " + address);
                    udp.stop();
                    resolve(address);
                });
                udp.listen();
            });
        });
    }
    /**
     * Adapter is up and ready. Check if we can connect to our Dingz and setup states and temperature polling
     */
    onReady() {
        return __awaiter(this, void 0, void 0, function* () {
            // Reset the connection indicator during startup. We'll set to true later, if we can connect
            this.setState("info.connection", false, true);
            // don't accept too short polling intervals
            this.interval = Math.max((this.config.interval || 60), 60);
            this.log.debug("Polling Interval: " + this.interval);
            // fetch informations about our dingz. If successful, set info.connection to true (making the indicator "green")
            const di = yield this.doFetch("device");
            if (di.error) {
                this.log.error("Could not connect to device. Errmsg: " + di.error);
            }
            else {
                const keys = Object.keys(di);
                const mac = keys[0];
                this.setState("info.deviceInfo.mac", mac, true);
                this.setState("info.deviceInfo.details", di[mac], true);
                this.log.info("Dingz Info: " + JSON.stringify(di[mac]));
                this.setState("info.connection", true, true);
                // we're connected. So Set up State Objects
                yield this.createObjects();
                this.doFetch("temp").then(temp => {
                    this.setStateAsync("temperature", temp.temperature, true);
                });
                // this.subscribeStates("*");
                // Read temperature regularly and set state accordingly
                this.timer = setInterval(() => {
                    this.doFetch("temp").then(temp => {
                        this.setStateAsync("temperature", temp.temperature, true);
                    });
                }, this.interval * 1000);
            }
        });
    }
    /**
     * Adapter shuts down - clear Timer
     */
    onUnload(callback) {
        try {
            if (this.timer) {
                clearInterval(this.timer);
            }
            this.log.info("cleaned everything up...");
            callback();
        }
        catch (e) {
            callback();
        }
    }
    /**
     * Is called if a subscribed state changes
     *
     
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
      if (state) {
        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        if (!state.ack) {
          // change came from UI or program
          const offs = "dingz.0.buttons.".length
          const subid = id.substr(offs).replace(/\./g, "/")
          const url = "http://" + this.config.url + API + "action/btn" + subid
          this.log.debug("POSTing " + url)
  
          fetch(url, { method: "POST", body: state.val as string, redirect: "follow" }).then(posted => {
            return posted.text()
          }).then(text => console.log(text))
        }
      } else {
        this.log.info(`state ${id} deleted`);
      }
    }
  */
    /**
     * Called from onReady(). We create our State structure:
     * dingz.X:{
     *   info:{
     *      connected: boolean
     *      deviceInfo: DeviceInfo
     *   },
     *  buttons:{
     *      btn1: ButtonState,
     *      btn2: ButtonState,
     *      btn3: ButtonState,
     *      btn4: ButtonState
     *
     *    },
     *   temperature: string
     * }
     */
    createObjects() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setObjectAsync("temperature", {
                type: "state",
                common: {
                    name: "Temperature",
                    type: "string",
                    role: "indicator",
                    read: true,
                    write: false
                },
                native: {}
            });
            yield this.setObjectAsync("buttons", {
                type: "channel",
                common: {
                    name: "button",
                    role: "state"
                },
                native: {}
            });
            this.config.trackbtn1 && (yield this.createButton(1));
            this.config.trackbtn2 && (yield this.createButton(2));
            this.config.trackbtn3 && (yield this.createButton(3));
            this.config.trackbtn4 && (yield this.createButton(4));
        });
    }
    createButton(btn) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setObjectAsync("buttons." + btn, {
                type: "channel",
                common: {
                    name: "Button " + btn,
                },
                native: {}
            });
            yield this.createButtonState(btn, "generic");
            yield this.createButtonState(btn, "single");
            yield this.createButtonState(btn, "double");
            yield this.createButtonState(btn, "long");
            yield this.createButtonState(btn, "press_release");
        });
    }
    createButtonState(button, substate) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setObjectAsync(`buttons.${button}.${substate}`, {
                type: "state",
                common: {
                    name: substate,
                    type: "boolean",
                    role: "action",
                    read: true,
                    write: true
                },
                native: {}
            });
            if (substate != "press_release") {
                yield this.programButton(button, substate);
            }
        });
    }
    programButton(number, action) {
        const def = `${this.config.hostip}/set/dingz.${this.instance}.buttons.${number}.${action}?value=true`;
        this.log.info("programming btn " + number + ": " + JSON.stringify(def));
        const url = `${this.config.url}${API}action/btn${number}/${action}`;
        this.log.info("POSTing " + url + "; " + def);
        return node_fetch_1.default(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "get://" + def.substring("http://".length),
            redirect: "follow"
        }).then(response => {
            if (response.status != 200) {
                this.log.error("Error while POSTing command " + response.status + ", " + response.statusText);
            }
            else {
                this.log.info("POST succesful");
            }
        }).catch(err => {
            this.log.error("Exception whilePOSTing: " + err);
        });
    }
    doFetch(addr) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.config.url + API;
            this.log.info("Fetching " + url + addr);
            try {
                const response = yield node_fetch_1.default(url + addr, { method: "get" });
                if (response.status == 200) {
                    const result = yield response.json();
                    this.log.info("got " + JSON.stringify(result));
                    return result;
                }
                else {
                    this.log.error("Error while fetching " + addr + ": " + response.status);
                    this.setState("info.connection", false, true);
                    return {};
                }
            }
            catch (err) {
                this.log.error("Fatal error during fetch");
                this.setState("info.connection", false, true);
                return undefined;
            }
        });
    }
}
if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options) => new Dingz(options);
}
else {
    // otherwise start the instance directly
    (() => new Dingz())();
}
