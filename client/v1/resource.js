import { EventEmitter } from "events"
import _ from "lodash"
import camelKeys from "camelcase-keys"
import Request from "./request"
import Session from "./session"

export default class InstagramResource extends EventEmitter {
   constructor(session, params) {
      super(session, params)
      if (!(session instanceof Session)) throw new Error("Argument `session` is not instace of Session")
      this._session = session
      this._params = {}
      this.setParams(_.isObject(params) ? params : {})
   }
   get params() {
      return this.getParams()
   }
   get session() {
      return this._session
   }
   parseParams(params) {
      return params
   }
   setParams(params) {
      if (!_.isObject(params)) throw new Error("Method `setParams` must have valid argument")
      params = this.parseParams(params)
      if (!_.isObject(params)) throw new Error("Method `parseParams` must return object")
      this._params = params
      if (params.id) this.id = params.id
      return this
   }
   getParams() {
      return this._params
   }
   request() {
      return new Request(this._session)
   }
}