"use strict";
/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 * Copyright (c) 2020 by G. Weirich
 * License: See LICENSE
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
const main_1 = require("./main");
const node_fetch_1 = require("node-fetch");
class Dimmers {
    constructor(d) {
        this.d = d;
    }
    createDimmerObjects() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync("dimmers", {
                type: "channel",
                common: {
                    name: "Dimmers",
                    role: "state"
                },
                native: {}
            });
            yield this.createDimmer(0);
            yield this.createDimmer(1);
            yield this.createDimmer(2);
            yield this.createDimmer(3);
        });
    }
    createDimmer(dimmer) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync("dimmers." + dimmer, {
                type: "channel",
                common: {
                    name: "Dimmer " + dimmer,
                },
                native: {}
            });
            yield this.createDimmerState(dimmer, "on", "boolean");
            yield this.createDimmerState(dimmer, "value", "number");
            yield this.createDimmerState(dimmer, "ramp", "number");
            yield this.createDimmerState(dimmer, "disabled", "boolean");
        });
    }
    createDimmerState(dimmer, substate, type) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync(`dimmers.${dimmer}.${substate}`, {
                type: "state",
                common: {
                    name: substate,
                    type: type,
                    role: "indicator",
                    read: true,
                    write: true
                },
                native: {}
            });
        });
    }
    setDimmerStates(n) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setDimmerState(0, n["0"]);
            yield this.setDimmerState(1, n["1"]);
            yield this.setDimmerState(2, n["2"]);
            yield this.setDimmerState(3, n["3"]);
        });
    }
    setDimmerState(n, s) {
        return __awaiter(this, void 0, void 0, function* () {
            this.d.log.silly("Setting dimmer states for " + n + ", " + JSON.stringify(s));
            yield this.d.setStateAsync("actions.pir.single", true, true);
            yield this.d.setStateAsync("actions.pir.double", true, false);
            yield this.d.setStateAsync("dingz.0.actions.pir.long", true, true);
            yield this.d.setStateAsync(`dimmers.${n.toString()}.on`, s.on, true);
            yield this.d.setStateAsync(`dimmers.${n}.value`, s.value, true);
            yield this.d.setStateAsync(`dimmers.${n}.ramp`, s.ramp, true);
            yield this.d.setStateAsync(`dimmers.${n}.disabled`, s.disabled, true);
        });
    }
    sendDimmerState(id, state) {
        return __awaiter(this, void 0, void 0, function* () {
            const parts = id.split(".");
            if (parts.length != 3) {
                this.d.log.error("bad dimmer id");
            }
            else {
                const num = parts[1];
                const action = parts[2];
                if (action == "on") {
                    yield this.doPost(`${num}/${state.val ? "on" : "off"}`);
                }
                else {
                    if (action == "value") {
                        const ramp = yield this.d.getStateAsync(`dimmers.${num}.ramp`);
                        this.doPost(num, state.val, ramp.val);
                    }
                }
            }
        });
    }
    doPost(dimmer, value, ramp) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.d.config.url + main_1.API + "dimmer/" + dimmer + (ramp ? "/on" : "");
            this.d.log.info(`Posting ${url}; {value: ${value}, ramp: ${ramp}}`);
            try {
                let encoded;
                if (ramp && value) {
                    encoded = new URLSearchParams();
                    encoded.append("value", value.toString());
                    encoded.append("ramp", ramp.toString());
                }
                const response = yield node_fetch_1.default(url, {
                    method: "post",
                    headers: {
                        "Content-type": "x-www-form-urlencoded"
                    },
                    body: encoded || "",
                    redirect: "follow"
                });
                if (response.status == 200) {
                    this.d.log.info("ok");
                }
                else {
                    this.d.log.error("Error while posting " + url + ": " + response.status + ", " + response.statusText);
                    // this.d.setState("info.connection", false, true);
                }
            }
            catch (err) {
                this.d.log.error("Fatal error during fetch " + err);
                this.d.setState("info.connection", false, true);
            }
        });
    }
}
exports.Dimmers = Dimmers;
