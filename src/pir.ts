import { Dingz } from "./main"

export class PIR {

  constructor(private d: Dingz) {

  }
  public async createPIRObjects(): Promise<void> {
    await this.d.setObjectAsync("pir", {
      type: "channel",
      common: {
        name: "PIR",
        role: "state"
      },
      native: {}
    })

    await this.d.setObjectAsync("pir.intensity", {
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

    await this.d.setObjectAsync("pir.phase", {
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

    await this.d.setObjectAsync("pir.adc0", {
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
    await this.d.setObjectAsync("pir.adc1", {
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
}