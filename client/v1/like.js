import Resource from "./resource"
import _ from "lodash"
import Request from "./request"

export default class Like extends Resource {
   constructor() {
      super()
   }
   parseParams(json) {
      return json || {}
   }
   static create(session, mediaId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("like", { id: mediaId })
         .generateUUID()
         .setData({
            media_id: mediaId,
            src: "profile"
         })
         .signPayload()
         .send()
         .then(function(data) {
            return new Like(session, {})
         })
   }
   static destroy(session, mediaId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("unlike", { id: mediaId })
         .generateUUID()
         .setData({
            media_id: mediaId,
            src: "profile"
         })
         .signPayload()
         .send()
         .then(data => {
            return new Like(session, {})
         })
   }
}