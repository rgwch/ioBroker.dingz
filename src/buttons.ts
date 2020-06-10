import { Dingz, API } from "./main"

export class Buttons {
  constructor(private d: Dingz) { }

  public async createButtonObjects(): Promise<void> {
    await this.d.setObjectAsync("buttons", {
      type: "channel",
      common: {
        name: "button",
        role: "state"
      },
      native: {}
    })

    this.d.config.trackbtn1 && await this.createButton(1)
    this.d.config.trackbtn2 && await this.createButton(2)
    this.d.config.trackbtn3 && await this.createButton(3)
    this.d.config.trackbtn4 && await this.createButton(4)
  }

  private async createButton(btn: number): Promise<void> {
    await this.d.setObjectAsync("buttons." + btn, {
      type: "channel",
      common: {
        name: "Button " + btn,
      },
      native: {}
    })
    await this.createButtonState(btn, "generic")
    await this.createButtonState(btn, "single")
    await this.createButtonState(btn, "double")
    await this.createButtonState(btn, "long")
    await this.createButtonState(btn, "press_release")
  }

  private async createButtonState(button: number, substate: string): Promise<void> {
    await this.d.setObjectAsync(`buttons.${button}.${substate}`, {
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
    if (substate != "press_release") {
      await this.programButton(button, substate)
    }
  }

  private programButton(number: number, action: string): Promise<void> {
    const def = `${this.d.config.hostip}/set/dingz.${this.d.instance}.buttons.${number}.${action}?value=true`
    this.d.log.info("programming btn " + number + ": " + JSON.stringify(def))
    const url = `${this.d.config.url}${API}action/btn${number}/${action}`
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
        this.d.log.info("POST succesful")
      }
    }).catch(err => {
      this.d.log.error("Exception whilePOSTing: " + err)
    })
  }

}