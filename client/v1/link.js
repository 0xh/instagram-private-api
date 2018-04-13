import Resource from "./resource"
import _ from "lodash"

function Link(session, params) {
   Resource.apply(this, arguments)
}

util.inherits(Link, Resource)
module.exports = Link
export default class Link extends Resource {
   constructor() {
      //    Resource.apply(this, arguments);
   }
   parseParams(json) {
      var hash = {}
      hash.text = json.text
      hash.link = {
         url: json.link_context.link_url,
         title: json.link_context.link_title,
         summary: json.link_context.link_summary,
         image: {
            url: json.link_context.link_image_url
         }
      }
      return hash
   }
}
