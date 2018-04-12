import _ from 'lodash';
import Resource from "./resource";
import camelKeys from 'camelcase-keys';

import Account from './account';
import Media from './media';
import Location from './location';
import Link from './link';
import Placeholder from './placeholder';
import Hashtag from './hashtag';

export default class ThreadItem extends Resource {

    parseParams(json) {
        var hash = camelKeys(json);
        hash.id = json.item_id || json.id;
        hash.type = json.item_type;

        if (hash.type === "link") {
            hash.link = 'link';
            this.link = new Link(this.session, json.link)
        }

        if (hash.type === "placeholder") {
            hash.placeholder = 'placeholder';
            this.placeholder = new Placeholder(this.session, json.placeholder)
        }
        if (hash.type === "text") {
            hash.text = json.text;
        }
        if (hash.type === "media") {
            hash.media = json.media.image_versions2.candidates;
        }
        if (hash.type === "media_share") {
            hash.type = 'mediaShare';
            this.mediaShare = new Media(this.session, json.media_share)
        }
        if (hash.type === "action_log") {
            hash.type = 'actionLog';
            hash.actionLog = json.action_log;
        }
        if (hash.type === "profile") {
            this.profile = new Account(this.session, json.profile);
            hash.profileMediaPreview = _.map(json.preview_medias || [], function (medium) {
                return {
                    id: medium.id.toString(),
                    images: medium.image_versions2.candidates
                }
            })
        }
        // @Todo media preview just like profile for location and hashtag
        if (hash.type === "location") {
            var location = json.location;
            location.location = Object.create(json.location);
            location.title = location.name;
            location.subtitle = null;
            this.location = new Location(this.session, location);
        }
        if (hash.type === "hashtag") {
            this.hashtag = new Hashtag(this.session, json.hashtag);
        }
        hash.accountId = json.user_id;
        hash.created = parseInt(json.timestamp / 1000);
        return hash;
    }

    getParams() {
        const params = _.clone(this._params);
        const types = ['link', 'placeholder', 'mediaShare', 'profile', 'location', 'hashtag'];

        if (~types.indexOf(params.type)) {
            params[param.type] = this[param.type].params;
        }

        return params;
    }

}
