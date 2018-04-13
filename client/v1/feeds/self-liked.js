import _ from "lodash"
import FeedBase from "./feed-base"
import Request from "../request"
import Media from "../media"
import { OnlyRankedItemsError, PlaceNotFound, ParseError } from "../exceptions"

export default class SelfLikedFeed extends FeedBase {
   constructor(session,mediaId, limit) {
      super(session, mediaId, limit)
      this.session = session
      this.limit = parseInt(limit) || null
   }
   get() {
      let that = this
      return new Request(that.session)
         .setMethod("GET")
         .setResource("selfLikedFeed", {
            maxId: that.getCursor()
         })
         .send()
         .then(function(data) {
            let nextMaxId = data.next_max_id ? data.next_max_id.toString() : data.next_max_id
            that.moreAvailable = data.more_available && !!nextMaxId
            if (that.moreAvailable) that.setCursor(nextMaxId)
            return _.map(data.items, function(medium) {
               return new Media(that.session, medium)
            })
         })
   }
}
