import _ from "lodash"
import FeedBase from "./feed-base"
import Request from "../request"
import Media from "../media"
import Helpers from "../../../helpers"
import Account from "../account"
import { OnlyRankedItemsError, PlaceNotFound, ParseError } from "../exceptions"

export default class UserMediaFeed extends FeedBase {
   constructor(session, accountId, limit) {
      super(session, accountId, limit)
      this.accountId = accountId
      this.timeout = 10 * 60 * 1000 // 10 minutes
      this.limit = limit
   }
   get() {
      var that = this
      return this.session.getAccountId().then(function(id) {
         var rankToken = Helpers.buildRankToken(id)
         return new Request(that.session)
            .setMethod("GET")
            .setResource("userFeed", {
               id: that.accountId,
               maxId: that.getCursor(),
               rankToken: rankToken
            })
            .send()
            .then(function(data) {
               that.moreAvailable = data.more_available
               var lastOne = _.last(data.items)
               if (that.moreAvailable && lastOne) that.setCursor(lastOne.id)
               return _.map(data.items, function(medium) {
                  return new Media(that.session, medium)
               })
            })
      })
   }
}
