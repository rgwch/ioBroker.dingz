/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 * Copyright (c) 2020 by G. Weirich
 * License: See LICENSE
 */

import { Dingz } from "./main"
import { PirState, MotionInfo } from "./dingz-types"

export class PIR {
  private timer: any = undefined

  constructor(private d: Dingz) { }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }
  public async createPIRObjects(): Promise<void> {
    await this.d.setObjectAsync("motion", {
      type: "state",
      common: {
        name: "motion",
        type: "boolean",
        role: "indicator",
        read: true,
        write: false
      },
      native: {}
    })
    await this.d.setObjectAsync("brightness", {
      type: "channel",
      common: {
        name: "brightness",
        role: "state"
      },
      native: {}
    })

    await this.d.setObjectAsync("brightness.intensity", {
      type: "state",
      common: {
        name: "intensity",
        type: "number",
        role: "indicator",
        read: true,
        write: false
      },
      native: {}
    })

    await this.d.setObjectAsync("brightness.phase", {
      type: "state",
      common: {
        name: "phase",
        type: "string",
        role: "indicator",
        read: true,
        write: false
      },
      native: {}
    })

    await this.d.setObjectAsync("brightness.adc0", {
      type: "state",
      common: {
        name: "adc0",
        type: "number",
        role: "indicator",
        read: true,
        write: false
      },
      native: {}
    })
    await this.d.setObjectAsync("brightness.adc1", {
      type: "state",
      common: {
        name: "adc1",
        type: "number",
        role: "indicator",
        read: true,
        write: false
      },
      native: {}
    })

  }

  public async setPirState(p: PirState): Promise<void> {
    this.d.setStateAsync("brightness.intensity", p.intensity, true)
    this.d.setStateAsync("brightness.phase", p.state, true)
    this.d.setStateAsync("brightness.adc0", p.raw.adc0, true)
    this.d.setStateAsync("brightness.adc1", p.raw.adc1, true)

  }

  /**
   * Track he motion detector until it's negative.
   */
  public trackMotion(): void {
    // Only if we're not already tracking
    if (!this.timer) {
      this.detectMotion().then(motion => {
        if (motion) {
          this.d.log.info("Begin tracking motion")
          this.timer = setInterval(() => {
            this.detectMotion().then(result => {
              if (!result) {
                clearInterval(this.timer)
                this.timer = undefined
                this.d.setState("actions.pir.generic", false, true)
                this.d.log.info("ended tracking motion")
              }
            })
          }, 1000)
        }
      })
    }
  }

  public async detectMotion(): Promise<boolean> {
    const res: MotionInfo = await this.d.doFetch("motion")
    this.d.log.info("detecting motion: " + JSON.stringify(res))
    if (res.success) {
      this.d.setState("motion", res.motion, true)
      return res.motion
    } else {
      this.d.log.error("Can't query motion detector");
      return false
    }
  }
}