/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 * Copyright (c) 2020 by G. Weirich
 * License: See LICENSE
 */

import { Dingz, API } from "./main"
import { ShadesState, ShadeState } from "./dingz-types"
import fetch from "node-fetch"


export class Shades {
  constructor(private d: Dingz) { }

  public async createShadeObjects(dip_config: number): Promise<void> {
    if (dip_config == 3) {
      return;
    }
    await this.d.setObjectAsync("shades", {
      type: "channel",
      common: {
        name: "Shades",
        role: "state"
      },
      native: {}
    })
    if ((dip_config & 1) == 0) {
      await this.createShade(0)
    }
    if ((dip_config & 2) == 0) {
      await this.createShade(1)
    }
  }

  private async createShade(shade: number): Promise<void> {
    await this.d.setObjectAsync("shades." + shade, {
      type: "channel",
      common: {
        name: "Shade " + shade,
      },
      native: {}
    })
    await this.createShadeState(shade, "blind", "number")
    await this.createShadeState(shade, "lamella", "number")
    await this.createShadeState(shade, "disabled", "boolean")
  }

  private async createShadeState(shade: number, substate: string, type: "boolean" | "number"): Promise<void> {
    await this.d.setObjectAsync(`shades.${shade}.${substate}`, {
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

  public async setShadeStates(n: ShadesState, dip_config: number): Promise<void> {
    if ((dip_config & 1) == 0) {
      await this.setShadeState(0, n["0"])
    }
    if ((dip_config & 2) == 0) {
      await this.setShadeState(1, n["1"])
    }
  }

  public async setShadeState(n: number, s: ShadeState): Promise<void> {
    this.d.log.silly("Setting shade states for " + n + ", " + JSON.stringify(s))
    await this.d.setStateAsync(`shades.${n}.blind`, s.current.blind, true)
    await this.d.setStateAsync(`shades.${n}.lamella`, s.current.lamella, true)
    await this.d.setStateAsync(`shades.${n}.disabled`, s.disabled, true)
  }

  public async sendShadeState(id: string, state: ioBroker.State): Promise<void> {
    const parts = id.split(".")
    if (parts.length != 3) {
      this.d.log.error("bad shade id")
    } else {
      const num = parts[1]
      const action = parts[2]
      if (action == "blind" || action == "lamella") {
        const blind = await this.d.getStateAsync(`shades.${num}.blind`)
        const lamella = await this.d.getStateAsync(`shades.${num}.lamella`)
        this.doPost(num, blind!.val as number, lamella!.val as number)
      }
    }
  }

  private async doPost(shade: string, blind = 0, lamella = 0): Promise<void> {
    const url = this.d.config.url + API + "shade/" + shade

    this.d.log.info(`Posting ${url}; {blind: ${blind}, lamella: ${lamella}}`)
    try {
      let encoded = new URLSearchParams()
      encoded.append("blind", blind.toString())
      encoded.append("lamella", lamella.toString())
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
