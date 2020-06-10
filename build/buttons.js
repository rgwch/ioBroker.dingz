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
const main_1 = require("./main");
class Buttons {
    constructor(d) {
        this.d = d;
    }
    createButtonObjects() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync("buttons", {
                type: "channel",
                common: {
                    name: "button",
                    role: "state"
                },
                native: {}
            });
            this.d.config.trackbtn1 && (yield this.createButton(1));
            this.d.config.trackbtn2 && (yield this.createButton(2));
            this.d.config.trackbtn3 && (yield this.createButton(3));
            this.d.config.trackbtn4 && (yield this.createButton(4));
        });
    }
    createButton(btn) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync("buttons." + btn, {
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
            yield this.d.setObjectAsync(`buttons.${button}.${substate}`, {
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
        const def = `${this.d.config.hostip}/set/dingz.${this.d.instance}.buttons.${number}.${action}?value=true`;
        this.d.log.info("programming btn " + number + ": " + JSON.stringify(def));
        const url = `${this.d.config.url}${main_1.API}action/btn${number}/${action}`;
        this.d.log.info("POSTing " + url + "; " + def);
        return fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "get://" + def.substring("http://".length),
            redirect: "follow"
        }).then(response => {
            if (response.status != 200) {
                this.d.log.error("Error while POSTing command " + response.status + ", " + response.statusText);
            }
            else {
                this.d.log.info("POST succesful");
            }
        }).catch(err => {
            this.d.log.error("Exception whilePOSTing: " + err);
        });
    }
}
exports.Buttons = Buttons;
