/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 * Copyright (c) 2020 by G. Weirich
 * License: See LICENSE
 */

import { Dingz, API } from "./main"
import { DimmersState, DimmerState } from "./dingz-types"
import fetch from "node-fetch"


export class Dimmers {
  constructor(private d: Dingz) { }

  public async createDimmerObjects(): Promise<void> {
    await this.d.setObjectAsync("dimmers", {
      type: "channel",
      common: {
        name: "Dimmers",
        role: "state"
      },
      native: {}
    })
    await this.createDimmer(0)
    await this.createDimmer(1)
    await this.createDimmer(2)
    await this.createDimmer(3)
  }

  private async createDimmer(dimmer: number): Promise<void> {
    await this.d.setObjectAsync("dimmers." + dimmer, {
      type: "channel",
      common: {
        name: "Dimmer " + dimmer,
      },
      native: {}
    })
    await this.createDimmerState(dimmer, "on", "boolean")
    await this.createDimmerState(dimmer, "value", "number")
    await this.createDimmerState(dimmer, "ramp", "number")
    await this.createDimmerState(dimmer, "disabled", "boolean")
  }

  private async createDimmerState(dimmer: number, substate: string, type: "boolean" | "number"): Promise<void> {
    await this.d.setObjectAsync(`dimmers.${dimmer}.${substate}`, {
      type: "state",
      common: {
        name: substate,
        type: type,
        role: "indicator",
        read: true,
        write: true
      },
      native: {}
    })
  }

  public async setDimmerStates(n: DimmersState): Promise<void> {
    await this.setDimmerState(0, n["0"])
    await this.setDimmerState(1, n["1"])
    await this.setDimmerState(2, n["2"])
    await this.setDimmerState(3, n["3"])
  }

  public async setDimmerState(n: number, s: DimmerState): Promise<void> {
    this.d.log.silly("Setting dimmer states for " + n + ", " + JSON.stringify(s))
    await this.d.setStateAsync(`dimmers.${n.toString()}.on`, s.on, true)
    await this.d.setStateAsync(`dimmers.${n}.value`, s.value, true)
    await this.d.setStateAsync(`dimmers.${n}.ramp`, s.ramp, true)
    await this.d.setStateAsync(`dimmers.${n}.disabled`, s.disabled, true)
  }

  public async sendDimmerState(id: string, state: ioBroker.State): Promise<void> {
    const parts = id.split(".")
    if (parts.length != 3) {
      this.d.log.error("bad dimmer id")
    } else {
      const num = parts[1]
      const action = parts[2]
      if (action == "on") {
        await this.doPost(`${num}/${state.val ? "on" : "off"}`)
      } else {
        if (action == "value") {
          const ramp = await this.d.getStateAsync(`dimmers.${num}.ramp`)
          this.doPost(num, state.val as number, ramp!.val as number)
        }
      }
    }
  }

  private async doPost(dimmer: string, value?: number, ramp = 0): Promise<void> {
    const url = this.d.config.url + API + "dimmer/" + dimmer + ((value != undefined) ? "/on" : "")

    this.d.log.info(`Posting ${url}; {value: ${value}, ramp: ${ramp}}`)
    try {
      let encoded
      if (value != undefined) {
        encoded = new URLSearchParams()
        encoded.append("value", value.toString())
        encoded.append("ramp", ramp.toString())
      }
      const response = await fetch(url, {
        method: "post",
        headers: {
          "Content-type": "x-www-form-urlencoded"
        },
        body: encoded || "",
        redirect: "follow"
      })
      if (response.status == 200) {
        this.d.log.info("ok")

      } else {
        this.d.log.error("Error while posting " + url + ": " + response.status + ", " + response.statusText)
        // this.d.setState("info.connection", false, true);
      }
    } catch (err) {
      this.d.log.error("Fatal error during fetch " + err)
      this.d.setState("info.connection", false, true);
    }
  }
}