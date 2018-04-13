import Resource from "./resource"
import _ from "lodash"
import Request from "./request"

export default class Save extends Resource {
   constructor() {
      super()
   }
   parseParams(json) {
      return json || {}
   }
   static create(session, mediaId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("save", { id: mediaId })
         .generateUUID()
         .setData({
            media_id: mediaId,
            src: "profile"
         })
         .signPayload()
         .send()
         .then(function(data) {
            return new Save(session, {})
         })
   }
   static destroy(session, mediaId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("unsave", { id: mediaId })
         .generateUUID()
         .setData({
            media_id: mediaId,
            src: "profile"
         })
         .signPayload()
         .send()
         .then(function(data) {
            return new Save(session, {})
         })
   }
}
