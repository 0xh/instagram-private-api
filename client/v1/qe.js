import Resource from "./resource"
import _ from "lodash"
import CONSTANTS from "constants"
import Exceptions from "./exceptions"
import Request from "./request"

export default class QE extends Resource {
   constructor() {
      super()
   }
   static sync(session) {
      let random = parseInt(Math.random() * 100) + 1
      let experiments = _.sampleSize(CONSTANTS.EXPERIMENTS, random)
      return session.getAccountId().then(function(id) {
         return new Request(session)
            .setMethod("POST")
            .setResource("qeSync")
            .generateUUID()
            .setData({
               id: id,
               _uid: id,
               experiments: experiments.join(",")
            })
            .signPayload()
            .send()
      })
   }
}
