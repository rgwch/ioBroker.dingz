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
class PIR {
    constructor(d) {
        this.d = d;
        this.timer = undefined;
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
    createPIRObjects() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync("motion", {
                type: "state",
                common: {
                    name: "motion",
                    type: "boolean",
                    role: "indicator",
                    read: true,
                    write: false
                },
                native: {}
            });
            yield this.d.setObjectAsync("brightness", {
                type: "channel",
                common: {
                    name: "brightness",
                    role: "state"
                },
                native: {}
            });
            yield this.d.setObjectAsync("brightness.intensity", {
                type: "state",
                common: {
                    name: "intensity",
                    type: "number",
                    role: "indicator",
                    read: true,
                    write: false
                },
                native: {}
            });
            yield this.d.setObjectAsync("brightness.phase", {
                type: "state",
                common: {
                    name: "phase",
                    type: "string",
                    role: "indicator",
                    read: true,
                    write: false
                },
                native: {}
            });
            yield this.d.setObjectAsync("brightness.adc0", {
                type: "state",
                common: {
                    name: "adc0",
                    type: "number",
                    role: "indicator",
                    read: true,
                    write: false
                },
                native: {}
            });
            yield this.d.setObjectAsync("brightness.adc1", {
                type: "state",
                common: {
                    name: "adc1",
                    type: "number",
                    role: "indicator",
                    read: true,
                    write: false
                },
                native: {}
            });
        });
    }
    setPirState(p) {
        return __awaiter(this, void 0, void 0, function* () {
            this.d.setStateAsync("brightness.intensity", p.intensity, true);
            this.d.setStateAsync("brightness.phase", p.state, true);
            this.d.setStateAsync("brightness.adc0", p.raw.adc0, true);
            this.d.setStateAsync("brightness.adc1", p.raw.adc1, true);
        });
    }
    /**
     * Track he motion detector until it's negative.
     */
    trackMotion() {
        // Only if we're not already tracking
        if (!this.timer) {
            this.detectMotion().then(motion => {
                if (motion) {
                    this.d.log.info("Begin tracking motion");
                    this.timer = setInterval(() => {
                        this.detectMotion().then(result => {
                            if (!result) {
                                clearInterval(this.timer);
                                this.timer = undefined;
                                this.d.setState("actions.pir.generic", false, true);
                                this.d.log.info("ended tracking motion");
                            }
                        });
                    }, 1000);
                }
            });
        }
    }
    detectMotion() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.d.doFetch("motion");
            this.d.log.silly("detecting motion: " + JSON.stringify(res));
            if (res.success) {
                this.d.setState("motion", res.motion, true);
                return res.motion;
            }
            else {
                this.d.log.error("Can't query motion detector");
                return false;
            }
        });
    }
}
exports.PIR = PIR;
