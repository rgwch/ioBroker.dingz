import { Dingz, PirState } from "./main"

export class PIR {

  constructor(private d: Dingz) {

  }
  public async createPIRObjects(): Promise<void> {
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
}