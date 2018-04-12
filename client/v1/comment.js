import Resource from "./resource"
import _ from "lodash"
import crypto from "crypto"
import camelKeys from "camelcase-keys"
import Request from "./request"
import Account from "./account"
import Media from "./media"

export default class Comment extends Resource {
   parseParams(json) {
      var hash = camelKeys(json)
      hash.created = json.created_at
      hash.status = (json.status || "unknown").toLowerCase()
      hash.id = json.pk || json.id
      this.account = new Account(this.session, json.user)
      return hash
   }
   account() {
      return this.account
   }
   getParams() {
      return _.defaults(
         {
            account: this.account.params
         },
         this._params
      )
   }
   static create(session, mediaId, text) {
      return new Request(session)
         .setMethod("POST")
         .setResource("comment", { id: mediaId })
         .generateUUID()
         .setData({
            media_id: mediaId,
            src: "profile",
            comment_text: text,
            idempotence_token: crypto
               .createHash("md5")
               .update(text)
               .digest("hex")
         })
         .signPayload()
         .send()
         .then(function(data) {
            return new Comment(session, data.comment)
         })
   }
   static delete(session, mediaId, commentId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("commentDelete", { id: mediaId, commentId: commentId })
         .generateUUID()
         .setData({
            media_id: mediaId,
            src: "profile",
            idempotence_token: crypto
               .createHash("md5")
               .update(commentId)
               .digest("hex")
         })
         .signPayload()
         .send()
         .then(function(data) {
            return data
         })
   }
   bulkDelete(session, mediaId, commentIds) {
      return new Request(session)
         .setMethod("POST")
         .setResource("commentBulkDelete", { id: mediaId })
         .generateUUID()
         .setData({
            media_id: mediaId,
            comment_ids_to_delete: commentIds.join(","),
            src: "profile",
            idempotence_token: crypto
               .createHash("md5")
               .update(commentIds.join(","))
               .digest("hex")
         })
         .signPayload()
         .send()
         .then(function(data) {
            return data
         })
   }
}
