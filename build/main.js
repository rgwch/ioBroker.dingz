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
const pir_1 = require("./pir");
const buttons_1 = require("./buttons");
const dimmers_1 = require("./dimmers");
// That's the only supported API as of now, AFAIK
exports.API = "/api/v1/";
class Dingz extends utils.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: "dingz" }));
        this.interval = 30;
        this.buttons = new buttons_1.Buttons(this);
        this.pir = new pir_1.PIR(this);
        this.dimmers = new dimmers_1.Dimmers(this);
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    /**
     * We could find Dingz via its UDB broadcast. Unused now.
     */
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
            this.interval = Math.max((this.config.interval || 30), 30);
            this.log.debug("Polling Interval: " + this.interval);
            // fetch informations about our dingz. If successful, set info.connection to true (making the indicator "green")
            const di = yield this.doFetch("device");
            if (!di) {
                this.log.error("Could not connect to device.");
            }
            else {
                const keys = Object.keys(di);
                const mac = keys[0];
                this.setState("info.deviceInfo.mac", mac, true);
                this.setState("info.deviceInfo.details", di[mac], true);
                this.log.info("Dingz Info: " + JSON.stringify(di[mac]));
                this.setState("info.connection", true, true);
                // we're connected. So set up State Objects
                yield this.createObjects();
                this.subscribeStates(this.namespace + ".dimmers.*");
                // initial read
                this.fetchValues();
                // Read temperature, PIR and dimmers regularly and set states accordingly
                this.timer = setInterval(() => {
                    this.fetchValues;
                }, this.interval * 1000);
            }
        });
    }
    fetchValues() {
        this.doFetch("temp").then(temp => {
            this.setStateAsync("temperature", temp.temperature, true);
        });
        this.doFetch("light").then((pir) => {
            this.setStateAsync("pir.intensity", pir.intensity, true);
            this.setStateAsync("pir.phase", pir.state, true);
            this.setStateAsync("pir.adc0", pir.raw.adc0, true);
            this.setStateAsync("pir.adc1", pir.raw.adc1, true);
        });
        this.doFetch("dimmer").then((res) => {
            this.dimmers.setDimmerStates(res);
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
     */
    onStateChange(id, state) {
        if (state) {
            this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            if (!state.ack) {
                // change came from UI or program
                const subid = id.substr(this.namespace.length + 1);
                if (subid.startsWith("dimmer")) {
                    this.log.info("dimmer changed " + id);
                    this.dimmers.sendDimmerState(subid, state);
                }
            }
            else {
                // change came from the device
            }
        }
        else {
            this.log.info(`state ${id} deleted`);
        }
    }
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
     *   temperature: string,
     *   pir: {
     *      intensity: number,
     *      phase: day|night|twilight,
     *      adc0: number,
     *      adc1: number
     *   }
     *    dimmers:{
     *      dim0: DimmerState,
     *      dim1: DimmerState,
     *      dim2: DimmerState,
     *      dim3: DimmerState
     *    }
     *
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
            yield this.buttons.createButtonObjects();
            yield this.pir.createPIRObjects();
            yield this.dimmers.createDimmerObjects();
        });
    }
    doFetch(addr) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.config.url + exports.API;
            this.log.info("Fetching " + url + addr);
            try {
                const response = yield node_fetch_1.default(url + addr, { method: "get" });
                if (response.status == 200) {
                    const result = yield response.json();
                    this.log.info("got " + JSON.stringify(result));
                    return result;
                }
                else {
                    this.log.error("Error while fetching " + url + addr + ": " + response.status);
                    // this.setState("info.connection", false, true);
                    return {};
                }
            }
            catch (err) {
                this.log.error("Fatal error during fetch " + url + addr + "; " + err);
                this.setState("info.connection", false, true);
                return undefined;
            }
        });
    }
}
exports.Dingz = Dingz;
if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options) => new Dingz(options);
}
else {
    // otherwise start the instance directly
    (() => new Dingz())();
}
