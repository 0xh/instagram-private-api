import _ from "lodash"
import FeedBase from "./feed-base"
import Request from "../request"
import ThreadItem from "../thread-item"
import { OnlyRankedItemsError, PlaceNotFound, ParseError } from "../exceptions"
import Helpers from "../../../helpers"

export default class ThreadItemsFeed extends FeedBase {
   constructor(session, threadId, limit) {
      super(session, threadId, limit)
      this.threadId = threadId
      this.limit = parseInt(limit) || null
   }
   get() {
      var that = this
      return new Request(this.session)
         .setMethod("GET")
         .setResource("threadsShow", {
            cursor: this.getCursor(),
            threadId: this.threadId
         })
         .send()
         .then(function(json) {
            var items = _.map(json.thread.items, function(item) {
               return new ThreadItem(that.session, item)
            })
            that.moreAvailable = json.thread.has_older
            if (that.isMoreAvailable()) that.setCursor(json.thread.oldest_cursor)
            return items
         })
   }
}
