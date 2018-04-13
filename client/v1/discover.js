import Request from "./request"
import Helpers from "../../helpers"
import _ from "lodash"
import Media from "./media"
import Account from "./account"



export default function(session, inSingup) {
    return new Request(session)
        .setMethod('POST')
        .setResource('discoverAyml')
        .generateUUID()
        .setData({
            phone_id: Helpers.generateUUID(),
            in_singup: inSingup ? 'true' : 'false',
            module: 'ayml_recommended_users'
        })
        .send()
        .then(function(json) {
            var groups = _.first(json.groups || []);
            var items = groups.items || [];
            return _.map(items, function(item) {
                return {
                    account: new Account(session, item.user),
                    mediaIds: item.media_ids
                }
            })
        })
};
