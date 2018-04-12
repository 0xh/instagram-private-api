import _ from "lodash"
import CONSTANTS from "./constants"
import md5 from "js-md5"
import devices from "./devices.json"
// Thanks to @mgp25 for such a list

export default class Device {
   constructor(username) {
      super(username)
      if (!_.isString(username))
         throw new Error(
            "`Device` class needs username to be able generate correlated phone_id seed!"
         )
      this.username = username
   }

   get id() {
      return "android-" + this.md5.slice(0, 16)
   }
   get md5() {
      return md5(this.username)
   }
   get md5int() {
      if (!this._md5int) this._md5int = parseInt(parseInt(this.md5, 32) / 10e32)
      return this._md5int
   }
   get api() {
      if (!this._api) this._api = 18 + this.md5int % 5
      return this._api
   }
   set api(api) {
      this._api = api
   }
   get release() {
      if (!this._release)
         this._release = ["4.0.4", "4.3.1", "4.4.4", "5.1.1", "6.0.1"][this.md5int % 5]
      return this._release
   }
   set release(release) {
      this._release = release
   }
   get info() {
      if (this._info) return this._info
      var line = devices[this.md5int % devices.length]
      var info = {
         manufacturer: line[0],
         device: line[1],
         model: line[2]
      }
      this._info = info
      return info
   }
   set info(info) {
      this._info = info
   }
   get payload() {
      var payload = {}
      payload.manufacturer = this.info.manufacturer
      payload.model = this.info.model
      payload.android_version = this.api
      payload.android_release = this.release
      return payload
   }
   get dpi() {
      if (!this._dpi)
         this._dpi = ["801", "577", "576", "538", "515", "424", "401", "373"][this.md5int % 8]
      return this._dpi
   }
   set dpi(dpi) {
      this._dpi = dpi
   }
   get resolution() {
      if (!this._resolution)
         this._resolution = [
            "3840x2160",
            "1440x2560",
            "2560x1440",
            "1440x2560",
            "2560x1440",
            "1080x1920",
            "1080x1920",
            "1080x1920"
         ][this.md5int % 8]
      return this._resolution
   }
   set resolution(resolution) {
      this._resolution = resolution
   }
   get language() {
      if (!this._language) this._language = "en_US"
      return this._language
   }
   set language(lang) {
      this._language = lang
   }
   userAgent(version) {
    var agent = [
        this.api + "/" + this.release,
        this.dpi + "dpi",
        this.resolution,
        this.info.manufacturer,
        this.info.model,
        this.info.device,
        this.language
     ]
     return CONSTANTS.instagramAgentTemplate({
        agent: agent.join("; "),
        version: version || CONSTANTS.PRIVATE_KEY.APP_VERSION
     })
   }
}
