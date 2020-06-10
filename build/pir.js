"use strict";
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
    }
    createPIRObjects() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync("pir", {
                type: "channel",
                common: {
                    name: "PIR",
                    role: "state"
                },
                native: {}
            });
            yield this.d.setObjectAsync("pir.intensity", {
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
            yield this.d.setObjectAsync("pir.phase", {
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
            yield this.d.setObjectAsync("pir.adc0", {
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
            yield this.d.setObjectAsync("pir.adc1", {
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
}
exports.PIR = PIR;
