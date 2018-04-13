import _ from "lodash"
import Resource from "./resource"
import camelKeys from "camelcase-keys"
import Request from "./request"
import Helpers from "../../helpers"

export default class Hastag extends Resource {
   constructor() {
      super()
   }
   parseParams(json) {
      let hash = camelKeys(json)
      hash.mediaCount = parseInt(json.media_count)
      if (_.isObject(hash.id)) hash.id = hash.id.toString()
      return hash
   }
   static search(session, query) {
      return session
         .getAccountId()
         .then(function(id) {
            let rankToken = Helpers.buildRankToken(id)
            return new Request(session)
               .setMethod("GET")
               .setResource("hashtagsSearch", {
                  query: query,
                  rankToken: rankToken
               })
               .send()
         })
         .then(function(data) {
            return _.map(data.results, function(hashtag) {
               return new Hashtag(session, hashtag)
            })
         })
   }
   static related(session, tag) {
      return new Request(session)
         .setMethod("GET")
         .setResource("hashtagsRelated", {
            tag: tag,
            visited: `[{"id":"${tag}","type":"hashtag"}]`,
            related_types: '["hashtag"]'
         })
         .send()
         .then(function(data) {
            return _.map(data.related, function(hashtag) {
               return new Hashtag(session, hashtag)
            })
         })
   }
   static info(session, tag) {
      return new Request(session)
         .setMethod("GET")
         .setResource("hashtagsInfo", {
            tag: tag
         })
         .send()
         .then(function(hashtag) {
            return new Hashtag(session, hashtag)
         })
   }
}
