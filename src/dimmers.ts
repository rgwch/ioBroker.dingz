import { Dingz, API, DimmersState, DimmerState } from "./main"

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
    await this.setDimmerState(0, n.d0)
    await this.setDimmerState(1, n.d1)
    await this.setDimmerState(2, n.d2)
    await this.setDimmerState(3, n.d3)
  }

  public async setDimmerState(n: number, s: DimmerState): Promise<void> {
    await this.d.setStateAsync(`dimmers.${n}.on`, s.on)
    await this.d.setStateAsync(`dimmers.${n}.value`, s.value)
    await this.d.setStateAsync(`dimmers.${n}.ramp`, s.ramp)
    await this.d.setStateAsync(`dimmers.${n}.disabled`, s.disabled)
  }

  public async sendDimmerState(id: string, state: ioBroker.State): Promise<void> {
    const parts = id.split(".")
    if (parts.length != 3) {
      this.d.log.error("bad dimmer id")
    } else {
      const num = parts[1]
      const action = parts[2]
      if (action == "on") {
        await this.d.doFetch(`dimmer/${num}/${state.val} ? "on" : "off`)
      } else {
        if (action == "value") {
          const ramp = await this.d.getStateAsync(`dimmers.${num}.ramp`)
          this.doPost(num, state.val as number, ramp!.val as number)
        }
      }
    }
  }

  private async doPost(dimmer: string, value: number, ramp: number): Promise<any> {
    const url = this.d.config.url + API + "dimmer/" + dimmer

    this.d.log.info("Posting " + url)
    try {
      const encoded = new URLSearchParams()
      encoded.append("value", value.toString())
      encoded.append("ramp", ramp.toString())
      const response = await fetch(url, {
        method: "post",
        headers: {
          "Content-type": "x-www-form-urlencoded"
        },
        body: encoded,
        redirect: "follow"
      })
      if (response.status == 200) {
        const result = await response.json()
        this.d.log.info("got " + JSON.stringify(result))
        return result

      } else {
        this.d.log.error("Error while fetching " + url + ": " + response.status)
        this.d.setState("info.connection", false, true);
        return {}
      }
    } catch (err) {
      this.d.log.error("Fatal error during fetch")
      this.d.setState("info.connection", false, true);
      return undefined
    }
  }
}