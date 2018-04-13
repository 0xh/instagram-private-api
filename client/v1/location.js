import Resource from "./resource"
import _ from "lodash"
import camelKeys from "camelcase-keys"
import Request from "./request"
import Helpers from "../../helpers"
import Media from "./media"
import {PlaceNotFound} from "./exceptions"

export default class location extends Resource {
   constructor() {
      super()
   }
   static getRankedMedia(session, locationId) {
      return (
         new Request(session)
            .setMethod("GET")
            .setResource("locationFeed", {
               id: locationId,
               maxId: null,
               rankToken: Helpers.generateUUID()
            })
            .send()
            .then(function(data) {
               return _.map(data.ranked_items, function(medium) {
                  return new Media(session, medium)
               })
            })
            // will throw an error with 500 which turn to parse error
            .catch(Exceptions.ParseError, function() {
               throw new PlaceNotFound()
            })
      )
   }
   parseParams(json) {
      var hash = camelKeys(json)
      hash.address = json.location.address
      hash.city = json.location.city
      hash.state = json.location.state
      hash.id = json.location.id || json.location.pk
      hash.lat = parseFloat(json.location.lat) || 0
      hash.lng = parseFloat(json.location.lng) || 0
      return hash
   }
   static search(session, query) {
      var that = this
      return session
         .getAccountId()
         .then(function(id) {
            var rankToken = Helpers.buildRankToken(id)
            return new Request(session)
               .setMethod("GET")
               .setResource("locationsSearch", {
                  query: query,
                  rankToken: rankToken
               })
               .send()
         })
         .then(function(data) {
            return _.map(data.items, function(location) {
               return new Location(session, location)
            })
         })
   }
}

/*
Location.getRankedMedia = function (session, locationId) {
  return new Request(session)
      .setMethod('GET')
      .setResource('locationFeed', {
          id: locationId,
          maxId: null,
          rankToken: Helpers.generateUUID()
      })
      .send()
      .then(function(data) {
          return _.map(data.ranked_items, function (medium) {
              return new Media(session, medium);
          });
      })
      // will throw an error with 500 which turn to parse error
      .catch(Exceptions.ParseError, function(){
          throw new Exceptions.PlaceNotFound();
      })
};
*/
