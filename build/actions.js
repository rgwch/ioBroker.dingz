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
class Actions {
    constructor(d) {
        this.d = d;
    }
    createActionObjects() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync("actions", {
                type: "channel",
                common: {
                    name: "actions",
                    role: "state"
                },
                native: {}
            });
            this.d.config.trackbtn1 && (yield this.createAction("btn1"));
            this.d.config.trackbtn2 && (yield this.createAction("btn2"));
            this.d.config.trackbtn3 && (yield this.createAction("btn3"));
            this.d.config.trackbtn4 && (yield this.createAction("btn4"));
            this.d.config.trackpir && (yield this.createAction("pir"));
        });
    }
    createAction(acn) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync("actions." + acn, {
                type: "channel",
                common: {
                    name: "Action " + acn,
                },
                native: {}
            });
            yield this.createActionState(acn, "generic");
            if (acn != "pir") {
                yield this.createActionState(acn, "single");
                yield this.createActionState(acn, "double");
                yield this.createActionState(acn, "long");
            }
            // await this.createButtonState(btn, "press_release")
        });
    }
    createActionState(action, substate) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.d.setObjectAsync(`actions.${action}.${substate}`, {
                type: "state",
                common: {
                    name: substate,
                    type: "boolean",
                    role: "switch",
                    read: true,
                    write: true
                },
                native: {}
            });
            yield this.programAction(action, substate);
        });
    }
    programAction(name, action) {
        const def = `${this.d.config.hostip}/set/dingz.${this.d.instance}.actions.${name}.${action}?value=true&ack=true`;
        this.d.log.info("programming " + name + ": " + JSON.stringify(def));
        const url = `${this.d.config.url}${main_1.API}action/${name}/${action}`;
        this.d.log.info("POSTing " + url + "; " + def);
        return node_fetch_1.default(url, {
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
                this.d.log.info("POST successful");
            }
        }).catch(err => {
            this.d.log.error("Exception whilePOSTing: " + err);
        });
    }
}
exports.Actions = Actions;
