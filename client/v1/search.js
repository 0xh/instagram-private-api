import _ from "lodash"
import Request from "./request"
import Account from "./account"
import Hashtag from "./hashtag"
import Location from "./location"

export default function(session, query) {
   return session
      .getAccountId()
      .then(function(id) {
         return new Request(session)
            .setMethod("GET")
            .setResource("topSearch", {
               rankToken: Helpers.buildRankToken(id).toUpperCase(),
               query: query
            })
            .send()
      })
      .then(function(json) {
         var users = json.users.map(function(user) {
            return {
               user: new Account(session, user.user),
               position: user.position
            }
         })
         var places = json.places.map(function(place) {
            return {
               place: new Location(session, place.place),
               position: place.position
            }
         })
         var hashtags = json.hashtags.map(function(hashtag) {
            return {
               hashtag: new Hashtag(session, hashtag.hashtag),
               position: hashtag.position
            }
         })

         return {
            users: users,
            places: places,
            hashtags: hashtags
         }
      })
}
/*
module.exports = function (session, query) {
    return session.getAccountId()
        .then(function (id) {
            return new Request(session)
                .setMethod('GET')
                .setResource('topSearch',{
                    rankToken: Helpers.buildRankToken(id).toUpperCase(),
                    query:query
                })
                .send()
        })
        .then(function(json) {
            var users = json.users.map(function (user) {
                return {
                    user:new Account(session, user.user),
                    position:user.position
                };
            });
            var places = json.places.map(function (place) {
                return {
                    place:new Location(session, place.place),
                    position:place.position
                };
            });
            var hashtags = json.hashtags.map(function (hashtag) {
                return {
                    hashtag:new Hashtag(session, hashtag.hashtag),
                    position:hashtag.position
                };
            });

            return {
                users:users,
                places:places,
                hashtags:hashtags
            }
        })
};
*/
