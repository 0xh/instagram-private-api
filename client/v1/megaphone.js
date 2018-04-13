import _ from "lodash"
import Resource from "./resource"
import Exceptions from "./exceptions"

export default class Megaphone extends Resource {
   constructor() {
      super()
   }
   static log(session, data) {
      return new Request(session)
         .setMethod("POST")
         .setResource("megaphoneLog")
         .generateUUID()
         .setData(
            _.extend(data, {
               uuid: session.device.md5
            })
         )
   }
   static logSeenMainFeed(session) {
    return Megaphone.log(session, {
        action: "seen",
        display_medium: "main_feed",
        type: "feed_aysf"
     })
   }
}
