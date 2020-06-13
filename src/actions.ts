/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 * Copyright (c) 2020 by G. Weirich
 * License: See LICENSE
 */

import { Dingz, API } from "./main"
import fetch from "node-fetch"

export class Actions {
  constructor(private d: Dingz) { }

  public async createActionObjects(): Promise<void> {
    await this.d.setObjectAsync("actions", {
      type: "channel",
      common: {
        name: "actions",
        role: "state"
      },
      native: {}
    })

    this.d.config.trackbtn1 && await this.createAction("btn1")
    this.d.config.trackbtn2 && await this.createAction("btn2")
    this.d.config.trackbtn3 && await this.createAction("btn3")
    this.d.config.trackbtn4 && await this.createAction("btn4")
    this.d.config.trackpir && await this.createAction("pir")
  }

  private async createAction(acn: string): Promise<void> {
    await this.d.setObjectAsync("actions." + acn, {
      type: "channel",
      common: {
        name: "Action " + acn,
      },
      native: {}
    })
    await this.createActionState(acn, "generic")
    if (acn != "pir") {
      await this.createActionState(acn, "single")
      await this.createActionState(acn, "double")
      await this.createActionState(acn, "long")
    }
    // await this.createButtonState(btn, "press_release")
  }

  private async createActionState(action: string, substate: string): Promise<void> {
    await this.d.setObjectAsync(`actions.${action}.${substate}`, {
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
    await this.programAction(action, substate)
  }

  private programAction(name: string, action: string): Promise<void> {
    const def = `${this.d.config.hostip}/set/dingz.${this.d.instance}.actions.${name}.${action}?value=true&ack=true`
    this.d.log.info("programming " + name + ": " + JSON.stringify(def))
    const url = `${this.d.config.url}${API}action/${name}/${action}`
    this.d.log.info("POSTing " + url + "; " + def)
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "get://" + def.substring("http://".length),
      redirect: "follow"
    }).then(response => {
      if (response.status != 200) {
        this.d.log.error("Error while POSTing command " + response.status + ", " + response.statusText)
      } else {
        this.d.log.info("POST successful")
      }
    }).catch(err => {
      this.d.log.error("Exception whilePOSTing: " + err)
    })
  }

}