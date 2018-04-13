import _ from "lodash"
import FeedBase from "./feed-base"
import Request from "../request"
import Media from "../media"
import Helpers from "../../../helpers"
import {OnlyRankedItemsError,PlaceNotFound,ParseError} from "../exceptions"

export default class LocationMediaFeed extends FeedBase {
   constructor(session, locationId, limit) {
      super(session, locationId, limit)
      this.limit = parseInt(limit) || null
      this.locationId = locationId
   }
   get() {
      var that = this
      return (
         new Request(that.session)
            .setMethod("GET")
            .setResource("locationFeed", {
               id: that.locationId,
               maxId: that.getCursor(),
               rankToken: Helpers.generateUUID()
            })
            .send()
            .then(function(data) {
               that.moreAvailable = data.more_available && !!data.next_max_id
               if (!that.moreAvailable && !_.isEmpty(data.ranked_items) && !that.getCursor())
                  throw new OnlyRankedItemsError()
               if (that.moreAvailable) that.setCursor(data.next_max_id)
               return _.map(data.items, function(medium) {
                  return new Media(that.session, medium)
               })
            })
            // will throw an error with 500 which turn to parse error
            .catch(ParseError, function() {
               throw new PlaceNotFound()
            })
      )
   }
}
