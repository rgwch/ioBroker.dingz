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
      const num=parts[1]
      const action=parts[2]
      if(action=="on"){
        await this.d.doFetch(`dimmer/${num}/${state.val} ? "on" : "off`)
      }
    }
  }
}