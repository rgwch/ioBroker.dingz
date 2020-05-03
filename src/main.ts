/*
 * Created with @iobroker/create-adapter v1.24.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import fetch from "node-fetch"

type buttonState = {
    generic: string
    single: string
    double: string
    long: string
    press_release: boolean
}

type actionState = {
    generic: buttonState
    btn1: buttonState
    btn2: buttonState
    btn3: buttonState
    btn4: buttonState
    pir: buttonState
}
// Load your modules here, e.g.:
// import * as fs from "fs";

// Augment the adapter.config object with the actual types
// TODO: delete this in the next version
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ioBroker {
        interface AdapterConfig {
            // Define the shape of your options here (recommended)
            url: string;
            option2: string;
            // Or use a catch-all approach
            // [key: string]: any;
        }
    }
}

class Dingz extends utils.Adapter {
    private url = ""

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
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        // Initialize your adapter here

        // Reset the connection indicator during startup
        this.setState("info.connection", true, true);

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info("config url: " + this.config.url);
        this.log.info("config option2: " + this.config.option2);
        this.url = this.config.url + "/api/v1/"

        await this.setObjectAsync("dingz", {
            type: "device",
            common: {
                name: "Dingz"
            },
            native: {}
        })
        await this.setObjectAsync("dingz.properties", {
            type: "channel",
            common: {
                name: "System-Info",

            },
            native: {}
        })

        await this.setObjectAsync("dingz.properties.puckversion", {
            type: "state",
            common: {
                name: "PuckVersion",
                type: "string",
                role: "state",
                read: true,
                write: false
            },
            native: {}
        })

        await this.setObjectAsync("dingz.properties.temperature", {
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
        await this.setObjectAsync("dingz.buttons", {
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

        // in this template all states changes inside the adapters namespace are subscribed
        this.subscribeStates("*");

        const puckver = await this.doFetch("puck")
        await this.setStateAsync("dingz.properties.puckversion", `${puckver.hw.version}/${puckver.fw.version}`)

        const temp = await this.doFetch("temp")
        await this.setStateAsync("dingz.properties.temperature", temp.temperature)

        const buttons: actionState = await this.doFetch("action")
        await this.setButton("1", buttons.btn1)
        await this.setButton("2", buttons.btn2)
        await this.setButton("3", buttons.btn3)
        await this.setButton("4", buttons.btn4)

    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
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
    }

    private async setButton(number: string, def: buttonState): Promise<void> {
        await this.setStateAsync(`dingz.buttons.${number}.generic`, def.generic)
        await this.setStateAsync(`dingz.buttons.${number}.single`, def.single)
        await this.setStateAsync(`dingz.buttons.${number}.double`, def.double)
        await this.setStateAsync(`dingz.buttons.${number}.long`, def.long)
        await this.setStateAsync(`dingz.buttons.${number}.isOn`, def.press_release)
    }

    private async createButton(number: string): Promise<void> {
        await this.setObjectAsync("dingz.buttons." + number, {
            type: "channel",
            common: {
                name: "Button " + number,
            },
            native: {}
        })
        await this.setObjectAsync(`dingz.buttons.${number}.generic`, {
            type: "state",
            common: {
                name: "generic",
                role: "state",
                read: true,
                write: false
            },
            native: {}
        })
        await this.setObjectAsync(`dingz.buttons.${number}.single`, {
            type: "state",
            common: {
                name: "single",
                role: "state",
                read: true,
                write: false
            },
            native: {}
        })
        await this.setObjectAsync(`dingz.buttons.${number}.double`, {
            type: "state",
            common: {
                name: "double",
                role: "state",
                read: true,
                write: false
            },
            native: {}
        })
        await this.setObjectAsync(`dingz.buttons.${number}.long`, {
            type: "state",
            common: {
                name: "long",
                role: "state",
                read: true,
                write: false
            },
            native: {}
        })
        await this.setObjectAsync(`dingz.buttons.${number}.isOn`, {
            type: "state",
            common: {
                name: "On",
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