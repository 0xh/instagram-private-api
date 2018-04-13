import _ from "lodash"
import Resource from "./resource"

export default class Placeholder extends Resource {
   constructor() {
      super()
   }
   parseParams(json) {
      var hash = {}
      hash.is_linked = json.is_linked
      hash.title = json.title
      hash.message = json.message
      return hash
   }
}
