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
import { PIR } from "./pir"
import { Buttons } from "./buttons"
import { Dimmers } from "./dimmers"

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

export type DimmerState = {
  on: boolean;
  value: number;
  ramp: number;
  disabled: boolean;
  index: {
    relative: number;
    absolute: number;
  };
}

export type DimmersState = {
  d0: DimmerState;
  d1: DimmerState;
  d2: DimmerState;
  d3: DimmerState;
}

type PirState = {
  success: boolean;
  intensity: number;
  state: string;
  raw: {
    adc0: number;
    adc1: number;
  };
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
export const API = "/api/v1/"

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

export class Dingz extends utils.Adapter {
  private interval = 30
  private timer: any
  private buttons = new Buttons(this)
  private pir = new PIR(this)
  private dimmers = new Dimmers(this)

  public constructor(options: Partial<utils.AdapterOptions> = {}) {
    super({
      ...options,
      name: "dingz",
    });

    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    // this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));

  }

  /**
   * We could find Dingz via its UDB broadcast. Unused now.
   */
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
    this.interval = Math.max((this.config.interval || 30), 30)
    this.log.debug("Polling Interval: " + this.interval)


    // fetch informations about our dingz. If successful, set info.connection to true (making the indicator "green")
    const di = await this.doFetch("device")
    if (!di) {
      this.log.error("Could not connect to device.")
    } else {
      const keys = Object.keys(di)
      const mac = keys[0]
      this.setState("info.deviceInfo.mac", mac, true)
      this.setState("info.deviceInfo.details", di[mac], true)
      this.log.info("Dingz Info: " + JSON.stringify(di[mac]))
      this.setState("info.connection", true, true);
      // we're connected. So set up State Objects
      await this.createObjects()

      this.subscribeStates("dimmers.*");

      // initial read
      this.fetchValues()
      // Read temperature, PIR and dimmers regularly and set states accordingly
      this.timer = setInterval(() => {
        this.fetchValues
      }, this.interval * 1000)
    }

  }

  private fetchValues(): void {
    this.doFetch("temp").then(temp => {
      this.setStateAsync("temperature", temp.temperature, true)
    })
    this.doFetch("light").then((pir: PirState) => {
      this.setStateAsync("pir.intensity", pir.intensity)
      this.setStateAsync("pir.phase", pir.state)
      this.setStateAsync("pir.adc0", pir.raw.adc0)
      this.setStateAsync("pir.adc1", pir.raw.adc1)
    })

    this.doFetch("dimmer").then((res: DimmersState) => {
      this.dimmers.setDimmerStates(res)
    })

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
   */

  private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
    if (state) {
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
      if (!state.ack) {
        // change came from UI or program
        if (id.startsWith("dimmer")) {
          this.log.info("dimmer changed")
          this.dimmers.sendDimmerState(id, state)
        }

      } else {
        // change came from the device

      }
    } else {
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
    await this.buttons.createButtonObjects()
    await this.pir.createPIRObjects()
    await this.dimmers.createDimmerObjects()
  }



  public async doFetch(addr: string): Promise<any> {
    const url = this.config.url + API

    this.log.info("Fetching " + url + addr)
    try {
      const response = await fetch(url + addr, { method: "get" })
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