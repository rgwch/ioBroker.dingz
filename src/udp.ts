import * as dgram from "dgram"
import { EventEmitter } from "events"

export class UDP extends EventEmitter {
  devices = new Map()
  server= dgram.createSocket("udp4")
  constructor(log: ioBroker.Logger) {
    super()
    this.server.on("error", err => {
      log.error("UDP listener error " + err)
    })
    this.server.on("message", (msg: Uint8Array, rinfo) => {
      log.info("found " + msg + " from " + rinfo.address)

      if (msg.length == 8) {
        const mac = msg.subarray(0, 5)
        if (!this.devices.has(mac.toString())) {
          const dingzID = msg[6]
          if (dingzID == 108) {
            this.emit("dingz", mac, rinfo.address)
            this.devices.set(mac.toString(),rinfo)
          }
        }
      }
    })
  }
  public listen(): void{
    this.server.bind(7979)
  }
  public stop(): void{
    this.server.close()
  }

}