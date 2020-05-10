/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 * Copyright (c) 2020 by G. Weirich
 * License: See LICENSE
 *
 * Adapter templated created with @iobroker/create-adapter v1.24.2
 */

import * as utils from "@iobroker/adapter-core";
import fetch from "node-fetch"
import * as _ from "lodash"
import { UDP } from "./udp"

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
}

// That's the only supported API as of now, AFAIK
const API = "/api/v1/"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ioBroker {
    interface AdapterConfig {
      url: string;
      interval: number;
      hostip: string;
      trackbtn1: boolean;
      trackbtn2: boolean;
      trackbtn3: boolean;
      trackbtn4: boolean;

    }
  }
}

class Dingz extends utils.Adapter {
  private interval = 30
  private timer: any

  public constructor(options: Partial<utils.AdapterOptions> = {}) {
    super({
      ...options,
      name: "dingz",
    });

    this.on("ready", this.onReady.bind(this));
    // this.on("stateChange", this.onStateChange.bind(this));
    // this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));

  }

  private async findDingz(): Promise<string> {
    return new Promise((resolve) => {
      const udp = new UDP(this.log)
      udp.on("dingz", (mac, address) => {
        this.log.info("found Dingz at " + address)
        udp.stop()
        resolve(address)
      })
      udp.listen()
    })
  }

  /** 
   * Adapter is up and ready. Check if we can connect to our Dingz and setup states and temperature polling
   */
  private async onReady(): Promise<void> {

    // Reset the connection indicator during startup. We'll set to true later, if we can connect
    this.setState("info.connection", false, true);

    // don't accept too short polling intervals
    this.interval = Math.max((this.config.interval || 60), 60)
    this.log.debug("Polling Interval: " + this.interval)


    // fetch informations about our dingz. If successful, set info.connection to true (making the indicator "green")
    const di = await this.doFetch("device")
    if (di.error) {
      this.log.error("Could not connect to device. Errmsg: " + di.error)
    } else {
      const keys = Object.keys(di)
      const mac = keys[0]
      this.setState("info.deviceInfo.mac", mac, true)
      this.setState("info.deviceInfo.details", di[mac], true)
      this.log.info("Dingz Info: " + JSON.stringify(di[mac]))
      this.setState("info.connection", true, true);
      // we're connected. So Set up State Objects
      await this.createObjects()


      this.doFetch("temp").then(temp => {
        this.setStateAsync("temperature", temp.temperature, true)
      })

      // this.subscribeStates("*");

      // Read temperature regularly and set state accordingly
      this.timer = setInterval(() => {
        this.doFetch("temp").then(temp => {
          this.setStateAsync("temperature", temp.temperature, true)
        })

      }, this.interval * 1000)
    }

  }

  /**
   * Adapter shuts down - clear Timer
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

    this.config.trackbtn1 && await this.createButton(1)
    this.config.trackbtn2 && await this.createButton(2)
    this.config.trackbtn3 && await this.createButton(3)
    this.config.trackbtn4 && await this.createButton(4)
  }


  private async createButton(btn: number): Promise<void> {
    await this.setObjectAsync("buttons." + btn, {
      type: "channel",
      common: {
        name: "Button " + btn,
      },
      native: {}
    })
    await this.createButtonState(btn, "generic")
    await this.createButtonState(btn, "single")
    await this.createButtonState(btn, "double")
    await this.createButtonState(btn, "long")
    // await this.createButtonState(btn, "press_release")
  }

  private async createButtonState(button: number, substate: string): Promise<void> {
    await this.setObjectAsync(`buttons.${button}.${substate}`, {
      type: "state",
      common: {
        name: substate,
        type: "boolean",
        role: "action",
        read: true,
        write: true
      },
      native: {}
    })
    await this.programButton(button, substate)
  }

  private programButton(number: number, action: string): Promise<void> {
    const def = `${this.config.hostip}/set/dingz.${this.instance}.buttons.${number}.${action}?value=true`
    this.log.info("programming btn " + number + ": " + JSON.stringify(def))
    let url = `${this.config.url}${API}action/btn${number}/${action}`
    if (url.indexOf("://") == -1) {
      url = "http://" + url
    }
    this.log.info("POSTing " + url + "; " + def)
    // const urlencoded = new URLSearchParams();
    // urlencoded.append("get://" + def.substring("http://".length), "true")
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "get://" + def.substring("http://".length),
      redirect: "follow"
    }).then(() => {
      console.log("POST succesful")
    })
      .catch(err => {
        this.log.error(err)
      })


    /*
    await this.setStateAsync(`buttons.${number}.generic`, def + "generic")
    await this.setStateAsync(`buttons.${number}.single`, def + "single")
    await this.setStateAsync(`buttons.${number}.double`, def + "double")
    await this.setStateAsync(`buttons.${number}.long`, def + "long")
    */
  }


  private async doFetch(addr: string): Promise<any> {
    const url = this.config.url + API

    this.log.info("Fetching " + url + addr)
    try {
      const response = await fetch("http://" + url + addr, { method: "get" })
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
      return undefined
    }
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