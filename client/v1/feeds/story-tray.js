import _ from "lodash"
import FeedBase from "./feed-base"
import Request from "../request"
import Media from "../media"
import Helpers from "../../../helpers"

export default class StoryTray {
   constructor(session) {
      super(session)
      this.session = session
   }
   get() {
      let that = this
      return new Request(that.session)
         .setMethod("GET")
         .setResource("storyTray")
         .send()
         .then(function(data) {
            var media = _.map(data.items, function(medium) {
               return new Media(that.session, medium)
            })
            return media
         })
   }
}
