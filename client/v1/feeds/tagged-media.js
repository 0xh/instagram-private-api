import _ from "lodash"
import FeedBase from "./feed-base"
import Request from "../request"
import Media from "../media"
import { OnlyRankedItemsError, PlaceNotFound, ParseError } from "../exceptions"
import Helpers from "../../../helpers"

export default class TaggedMediaFeed extends FeedBase {
   constructor(session, tag, limit) {
      super(session, tag, limit)
      this.tag = tag
      this.limit = parseInt(limit) || null
   }
   get() {
      var that = this
      return this.session.getAccountId().then(function(id) {
         var rankToken = Helpers.buildRankToken(id)
         return new Request(that.session)
            .setMethod("GET")
            .setResource("tagFeed", {
               tag: that.tag,
               maxId: that.getCursor(),
               rankToken: rankToken
            })
            .send()
            .then(function(data) {
               that.moreAvailable = data.more_available && !!data.next_max_id
               if (!that.moreAvailable && !_.isEmpty(data.ranked_items) && !that.getCursor())
                  throw new Exceptions.OnlyRankedItemsError()
               if (that.moreAvailable) that.setCursor(data.next_max_id)
               return _.map(data.items, function(medium) {
                  return new Media(that.session, medium)
               })
            })
      })
   }
}
