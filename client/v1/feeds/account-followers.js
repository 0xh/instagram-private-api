import _ from "lodash"
import FeedBase from "./feed-base"
import Request from "../request"
import Account from "../account"


export default class AccountFollowersFeed extends FeedBase {
   constructor(session, accountId, limit) {
      super(session, accountId, limit)
      this.accountId = accountId
      this.limit = limit || Infinity
      this.timeout = 10 * 60 * 1000
   }
   get(){
    let that = this
    return new Request(that.session)
       .setMethod("GET")
       .setResource("followersFeed", {
          id: that.accountId,
          maxId: that.cursor
       })
       .send()
       .then(function(data) {
          that.moreAvailable = !!data.next_max_id
          if (that.moreAvailable) {
             that.setCursor(data.next_max_id)
          }
          return _.map(data.users, function(user) {
             return new Account(that.session, user)
          })
       })
   }
}