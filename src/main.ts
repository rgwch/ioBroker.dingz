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
import { Actions } from "./actions"
import { Dimmers } from "./dimmers"
import { DeviceInfo, PirState, DimmersState } from "./dingz-types"


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
      trackpir: boolean;

    }
  }
}

export class Dingz extends utils.Adapter {
  private interval = 30
  private timer: any
  private actions = new Actions(this)
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
    const di: DeviceInfo = await this.doFetch("device")
    if (!di) {
      this.log.error("Could not connect to device.")
    } else {
      const keys = Object.keys(di)
      const mac = keys[0]
      this.setState("info.deviceInfo.mac", mac, true)
      if (!di[mac] || !di[mac].type || di[mac].type != "dingz") {
        this.log.error("The device at this address is not recognized! Is it really a Dingz?")
      } else {
        this.setState("info.deviceInfo.front_sn", di[mac].front_sn)
        this.setState("info.deviceInfo.puck_sn", di[mac].puck_sn)
        this.setState("info.deviceInfo.details", JSON.stringify(di[mac]), true)
        this.log.info("Dingz Info: " + JSON.stringify(di[mac]))
        this.setState("info.connection", true, true);
        // we're connected. So set up State Objects
        await this.createObjects()

        this.subscribeStates("*");

        // initial read
        this.fetchValues()
        this.pir.trackMotion()
        // Read temperature, PIR and dimmers regularly and set states accordingly
        this.timer = setInterval(this.fetchValues.bind(this), this.interval * 1000,)
      }
    }

  }

  private fetchValues(): void {
    this.log.silly("fetching values")
    this.doFetch("temp").then(temp => {
      this.setStateAsync("temperature", temp.temperature, true)
    })
    this.doFetch("light").then((pirState: PirState) => {
      this.pir.setPirState(pirState)
    })

    this.doFetch("dimmer").then((res: DimmersState) => {
      this.dimmers.setDimmerStates(res)
    })

  }

  /**
   * Adapter shuts down - clear Timers
   */
  private onUnload(callback: () => void): void {
    try {
      if (this.timer) {
        clearInterval(this.timer)
      }
      this.pir.stop()
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
        const subid = id.substr(this.namespace.length + 1)
        if (subid.startsWith("dimmer")) {
          this.log.info("dimmer changed " + id)
          this.dimmers.sendDimmerState(subid, state)
        }

      } else {
        // change came from the device. If it was the PIR, track it until no more motion is detected
        if (id.endsWith("pir.generic")) {
          this.log.info("tracking motion")
          this.pir.trackMotion()
        }
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
   *  actions:{
   *      btn1: ActionState,
   *      btn2: ActionState,
   *      btn3: ActionState,
   *      btn4: ActionState,
   *      pir: ActionState
   *      
   *    },
   *   temperature: string,
   *   motion: boolean,
   *   brightness: {
   *      intensity: number,
   *      phase: day|night|twilight,
   *      adc0: number,
   *      adc1: number,
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
    await this.actions.createActionObjects()
    await this.pir.createPIRObjects()
    await this.dimmers.createDimmerObjects()
  }



  /**
   * Query the Dingz
   * @param addr address part after http://address/api/v1/
   * @returns the Answer from the Dingz as JSON, if the call was successful. Empty Object if HTTP Status was != 200. Undefined on error.
   */
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
        this.log.error("Error while fetching " + url + addr + ": " + response.status)
        // this.setState("info.connection", false, true);
        return {}
      }
    } catch (err) {
      this.log.error("Fatal error during fetch " + url + addr + "; " + err)
      this.setState("info.connection", false, true);
      return undefined
    }
  }

}

/**
 * ioBroker boilerplate code
 */
if (module.parent) {
  // Export the constructor in compact mode
  module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Dingz(options);
} else {
  // otherwise start the instance directly
  (() => new Dingz())();
}
