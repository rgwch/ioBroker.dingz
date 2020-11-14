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
exports.Shades = void 0;
const main_1 = require("./main");
const node_fetch_1 = require("node-fetch");
class Shades {
    constructor(d) {
        this.d = d;
    }
    createShadeObjects(dip_config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (dip_config == 3) {
                return;
            }
            yield this.d.setObjectAsync("shades", {
                type: "channel",
                common: {
                    name: "Shades",
                    role: "state"
                },
                native: {}
            });
            if ((dip_config & 1) == 0) {
                yield this.createShade(0);
            }
            if ((dip_config & 2) == 0) {
                yield this.createShade(1);
            }
        });
    }
    createShade(shade) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync("shades." + shade, {
                type: "channel",
                common: {
                    name: "Shade " + shade,
                },
                native: {}
            });
            yield this.createShadeState(shade, "blind", "number");
            yield this.createShadeState(shade, "lamella", "number");
            yield this.createShadeState(shade, "disabled", "boolean");
        });
    }
    createShadeState(shade, substate, type) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync(`shades.${shade}.${substate}`, {
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
    setShadeStates(n, dip_config) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((dip_config & 1) == 0) {
                yield this.setShadeState(0, n["0"]);
            }
            if ((dip_config & 2) == 0) {
                yield this.setShadeState(1, n["1"]);
            }
        });
    }
    setShadeState(n, s) {
        return __awaiter(this, void 0, void 0, function* () {
            this.d.log.silly("Setting shade states for " + n + ", " + JSON.stringify(s));
            yield this.d.setStateAsync(`shades.${n}.blind`, s.current.blind, true);
            yield this.d.setStateAsync(`shades.${n}.lamella`, s.current.lamella, true);
            yield this.d.setStateAsync(`shades.${n}.disabled`, s.disabled, true);
        });
    }
    sendShadeState(id, state) {
        return __awaiter(this, void 0, void 0, function* () {
            const parts = id.split(".");
            if (parts.length != 3) {
                this.d.log.error("bad shade id");
            }
            else {
                const num = parts[1];
                const action = parts[2];
                if (action == "blind" || action == "lamella") {
                    const blind = yield this.d.getStateAsync(`shades.${num}.blind`);
                    const lamella = yield this.d.getStateAsync(`shades.${num}.lamella`);
                    this.doPost(num, blind.val, lamella.val);
                }
            }
        });
    }
    doPost(shade, blind = 0, lamella = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.d.config.url + main_1.API + "shade/" + shade;
            this.d.log.info(`Posting ${url}; {blind: ${blind}, lamella: ${lamella}}`);
            try {
                let encoded = new URLSearchParams();
                encoded.append("blind", blind.toString());
                encoded.append("lamella", lamella.toString());
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
exports.Shades = Shades;
