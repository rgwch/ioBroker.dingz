/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 *
 * Adapter templated created with @iobroker/create-adapter v1.24.2
 */

import * as utils from "@iobroker/adapter-core";
import fetch from "node-fetch"
import * as _ from "lodash"

/*
 *  Declare answers we might get from the dingz
 */

type DeviceInfo = {
    type: string;
    battery: boolean;
    reachable: boolean;
    meshroot: boolean;
    fw_version: string;
    hw_version: string;
    fw_version_puck: string;
    bl_version_puck: string;
    hw_version_puck: string;
    hw_id_puck: string;
    puck_sn: string;
    puck_production_date: {
        year: number;
        month: number;
        day: number;
    };
    puck_hw_model: string;
    front_hw_model: string;
    front_production_date: string;
    front_sn: string;
    dip_config: number;
    has_pir: boolean;
    hash: string;
    error?: string;
}

type ButtonState = {
    generic: string;
    single: string;
    double: string;
    long: string;
    press_release: boolean;
}

type ActionState = {
    generic: ButtonState;
    btn1: ButtonState;
    btn2: ButtonState;
    btn3: ButtonState;
    btn4: ButtonState;
    pir: ButtonState;
}

type PuckVersion = {
    fw: {
        success: boolean;
        version: string;
    };
    hw: {
        success: boolean;
        version: string;
    };
    error?: string;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ioBroker {
        interface AdapterConfig {
            // Define the shape of your options here (recommended)
            url: string;
            interval: number;
        }
    }
}

class Dingz extends utils.Adapter {
    private url!: string
    private interval = 30
    private timer: any
    private saved!: {
        btn1: ButtonState;
        btn2: ButtonState;
        btn3: ButtonState;
        btn4: ButtonState;
        generic: ButtonState;
        pir: ButtonState;
        error?: string;
    };

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "dingz",
        });

        this.on("ready", this.onReady.bind(this));
        this.on("objectChange", this.onObjectChange.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }


    /** 
     * Adapter is up and ready. Check if we can connect to our Dingz and start polling
     */
    private async onReady(): Promise<void> {

        // Reset the connection indicator during startup
        this.setState("info.connection", false, true);

        // from config
        this.url = this.config.url + "/api/v1/"
        this.log.debug(this.config.interval + " " + this.interval)
        this.interval = Math.max(this.config.interval, 10)
        this.log.info("Polling Interval: " + this.interval)

        await this.createObjects()

        const di = await this.doFetch("device")
        if (di.error) {
            this.log.error("Could not connect to puck. Errmsg: " + di.error)
        } else {
            const keys = Object.keys(di)
            const mac = keys[0]
            this.setState("info.deviceInfo.mac", mac, true)
            this.setState("info.deviceInfo.details", di[mac], true)
            this.log.info("Dingz Info: " + JSON.stringify(di[mac]))
            this.setState("info.connection", true, true);
        }

        await this.setStates()

        // after we've set the initial states, we subscribe on any changes
        this.subscribeStates("*");


        this.timer = setInterval(() => {
            if (!this.setStates()) {
                // this.setState("info.connection", false, true);
                this.log.info("Error while polling states")
            }
        }, this.interval * 1000)

    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
            if (this.timer) {
                clearInterval(this.timer)
            }
            this.log.info("cleaned everything up...");
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     */
    private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     */
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    private async doFetch(addr: string): Promise<any> {

        this.log.info("Fetching " + this.url + addr)
        try {
            const response = await fetch("http://" + this.url + addr)
            if (response.status == 200) {
                const result = await response.json()
                this.log.info("got " + JSON.stringify(result))
                return result

            } else {
                this.log.error("Error while fetching " + addr + ": " + response.status)
                this.setState("info.connection", false, true);
                return {}
            }
        } catch (err) {
            this.log.error("Fatal error during fetch")
            this.setState("info.connection", false, true);
            return { error: err }
        }
    }

    private async setStates(): Promise<boolean> {

        const temp = await this.doFetch("temp")
        if (temp.error) {
            return false
        }
        await this.setStateAsync("temperature", temp.temperature, true)

        const buttons: ActionState | string= await this.doFetch("action")
        if (typeof(buttons) == "string"){
            return false
        }

        for (const num of ["1", "2", "3", "4"]) {
            const id = "btn" + num
            this.validateIdx(id)
            if (!_.isEqual(this.saved[id], buttons[id])) {
                await this.setButton(num, buttons[id],true)
            }
        }
        if (!_.isEqual(this.saved.btn1, buttons.btn1)) {
            await this.setButton("1", buttons.btn1, true)
        }
        await this.setButton("2", buttons.btn2, true)

        await this.setButton("3", buttons.btn3, true)
        await this.setButton("4", buttons.btn4, true)
        this.saved = buttons
        return true
    }

    private validateIdx(value: string): asserts value is keyof ActionState{
        if(["1","2","3","4"].indexOf(value)==-1){
            throw Error("invalid index")
        }
    }
    private async setButton(number: string, def: ButtonState, ack: boolean): Promise<void> {
        await this.setStateAsync(`buttons.${number}.generic`, def.generic, ack)
        await this.setStateAsync(`buttons.${number}.single`, def.single, ack)
        await this.setStateAsync(`buttons.${number}.double`, def.double, ack)
        await this.setStateAsync(`buttons.${number}.long`, def.long, ack)
        await this.setStateAsync(`buttons.${number}.isOn`, def.press_release, true)
    }

    private async createObjects(): Promise<void> {

        await this.setObjectAsync("temperature", {
            type: "state",
            common: {
                name: "Temperature",
                type: "string",
                role: "indicator",
                read: true,
                write: false
            },
            native: {}

        })
        await this.setObjectAsync("buttons", {
            type: "channel",
            common: {
                name: "button",
                role: "state"
            },
            native: {}
        })

        await this.createButton("1")
        await this.createButton("2")
        await this.createButton("3")
        await this.createButton("4")
    }


    private async createButton(number: string): Promise<void> {
        await this.setObjectAsync("buttons." + number, {
            type: "channel",
            common: {
                name: "Button " + number,
            },
            native: {}
        })
        await this.createButtonState(number, "generic")
        await this.createButtonState(number, "single")
        await this.createButtonState(number, "double")
        await this.createButtonState(number, "long")

        await this.setObjectAsync(`buttons.${number}.isOn`, {
            type: "state",
            common: {
                name: "On",
                type: "boolean",
                role: "indicator",
                read: true,
                write: true
            },
            native: {}
        })

    }
    private async createButtonState(button: string, substate: string): Promise<void> {
        await this.setObjectAsync(`buttons.${button}.${substate}`, {
            type: "state",
            common: {
                name: substate,
                type: "string",
                role: "state",
                read: true,
                write: false
            },
            native: {}
        })
    }


    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  */
    // private onMessage(obj: ioBroker.Message): void {
    // 	if (typeof obj === "object" && obj.message) {
    // 		if (obj.command === "send") {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info("send command");

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    // 		}
    // 	}
    // }

}

if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Dingz(options);
} else {
    // otherwise start the instance directly
    (() => new Dingz())();
}