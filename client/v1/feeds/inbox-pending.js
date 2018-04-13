import _ from "lodash"
import FeedBase from "./feed-base"
import Thread from "../thread"
import Request from "../request"

export default class InboxPendingFeed extends FeedBase {
   constructor(session, limit) {
      super(session, limit)
      this.limit = parseInt(limit) || null
      this.pendingRequestsTotal = null
   }
   getPendingRequestsTotal() {
      return this.pendingRequestsTotal
   }
   get() {
      var that = this
      return new Request(this.session)
         .setMethod("GET")
         .setResource("inboxPending", {
            maxId: this.getCursor()
         })
         .send()
         .then(function(json) {
            that.moreAvailable = json.inbox.has_older
            that.pendingRequestsTotal = json.pending_requests_total
            if (that.moreAvailable) that.setCursor(json.inbox.oldest_cursor.toString())
            return _.map(json.inbox.threads, function(thread) {
               return new Thread(that.session, thread)
            })
         })
   }
}
