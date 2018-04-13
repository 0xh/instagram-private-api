import _ from "lodash"
import FeedBase from "./feed-base"
import Request from "../request"
import Media from "../media"
import Helpers from "../../../helpers"
import { OnlyRankedItemsError, PlaceNotFound, ParseError } from "../exceptions"

export default class TimelineFeed extends FeedBase {
   constructor(session, limit) {
      super(session, limit)
      this.limit = parseInt(limit) || null
   }
   get() {
      var that = this
      return this.session
         .getAccountId()
         .then(function(id) {
            var rankToken = Helpers.buildRankToken(id)
            return new Request(that.session)
               .setMethod("GET")
               .setResource("timelineFeed", {
                  maxId: that.getCursor(),
                  rankToken: rankToken
               })
               .send()
         })
         .then(function(data) {
            that.moreAvailable = data.more_available
            var media = _.compact(
               _.map(data.feed_items, function(item) {
                  var medium = item.media_or_ad
                  if (!medium || medium.injected) return false
                  return new Media(that.session, medium)
               })
            )
            if (that.moreAvailable) that.setCursor(data.next_max_id)
            return media
         })
   }
}
