import Request from "../request"
import Media from "../media"
import _ from "lodash"

export default class UserStory {
   constructor(session, userIds) {
      super(session, userIds)
      this.session = session
      this.userIds = userIds.map(id => String(id))
   }

   get() {
      var that = this
      return new Request(that.session)
         .setMethod("POST")
         .setResource("userStory")
         .generateUUID()
         .setData({
            user_ids: this.userIds
         })
         .signPayload()
         .send()
         .then(function(data) {
            return _.map(data.items, function(medium) {
               return new Media(that.session, medium)
            })
         })
   }
}
