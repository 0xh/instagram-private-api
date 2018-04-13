import _ from "lodash"
import FeedBase from "./feed-base"
import Request from "../request"
import Media from "../media"
import { OnlyRankedItemsError, PlaceNotFound, ParseError } from "../exceptions"

export default class SavedFeed extends FeedBase {
   constructor(session, limit) {
      super(session, mediaId, limit)
      this.timeout = 10 * 60 * 1000 // 10 minutes
      this.limit = limit
   }
   get() {
      var that = this
      return new Request(that.session)
         .setMethod("POST")
         .setResource("savedFeed", {
            maxId: that.cursor
         })
         .generateUUID()
         .setData({})
         .signPayload()
         .send()
         .then(function(data) {
            that.moreAvailable = data.more_available
            if (that.moreAvailable && data.next_max_id) {
               that.setCursor(data.next_max_id)
            }
            return _.map(data.items, function(medium) {
               return new Media(that.session, medium.media)
            })
         })
   }
}
