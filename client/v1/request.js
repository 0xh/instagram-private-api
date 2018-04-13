import _ from "lodash"
import Promise from "request-promise"
import JSONbig from "json-bigint"
import Agent from "socks5-https-client/lib/Agent"
import signatures from "./signatures"
import Device from "./device"
import Exceptions from "./exceptions"
import routes from "./routes"
import Helpers from "../../helpers"
import CONSTANTS from "./constants"
import Session from "./session"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0" //???????

export default class Request {
   constructor(session) {
      super(session)

      this.defaultHeaders = {
         "X-IG-Connection-Type": "WIFI",
         "X-IG-Capabilities": "3QI=",
         "Accept-Language": "en-US",
         Host: CONSTANTS.HOSTNAME,
         Accept: "*/*",
         "Accept-Encoding": "gzip, deflate, sdch",
         Connection: "Close"
      }

      this._id = _.uniqueId()
      this._url = null
      this._signData = false
      this._request = {}
      this._request.method = "GET"
      this._request.data = {}
      this._request.bodyType = "formData"
      this._request.options = {
         gzip: true
      }
      this._request.headers = _.extend({}, this.defaultHeaders)
      this.attemps = 2
      if (session) {
         this.session = session
      } else {
         this.setData({ _csrftoken: "missing" })
      }
      this._initialize.apply(this, arguments)
      this._transform = function(t) {
         return t
      }
   }
   static setTimeout(ms) {
      let object = { timeout: parseInt(ms) }
      Request.requestClient = request.defaults(object)
   }
   static setProxy(proxyUrl) {
      if (!Helpers.isValidUrl(proxyUrl)) throw new Error("`proxyUrl` argument is not an valid url")
      let object = { proxy: proxyUrl }
      Request.requestClient = request.defaults(object)
   }
   static setSocks5Proxy(host, port) {
      let object = {
         agentClass: Agent,
         agentOptions: {
            socksHost: host, // Defaults to 'localhost'.
            socksPort: port // Defaults to 1080.
         }
      }
      Request.requestClient = request.defaults(object)
   }
   get session() {
      return this._session
   }
   set session(session) {
      this.setSession(session)
   }

   get device() {
      return this._device
   }
   set device(device) {
      this.setDevice
   }
   get url() {
      return this._url
   }
   set url(url) {
      this.setUrl(url)
   }
   setOptions(options, override) {
      this._request.options = override
         ? _.extend(this._request.options, options || {})
         : _.defaults(this._request.options, options || {})
      return this
   }
   setMethod(method) {
      method = method.toUpperCase()
      if (!_.includes(["POST", "GET", "PATCH", "PUT", "DELETE"], method))
         throw new Error("Method `" + method + "` is not valid method")
      this._request.method = method
      return this
   }
   setData(data, override) {
      if (_.isEmpty(data)) {
         this._request.data = {}
         return this
      }
      if (_.isString(data)) {
         this._request.data = data
         return this
      }
      _.each(data, function(val, key) {
         data[key] = val && val.toString && !_.isObject(val) ? val.toString() : val
      })
      this._request.data = override ? data : _.extend(this._request.data, data || {})
      return this
   }
   setBodyType(type) {
      if (!_.includes(["form", "formData", "json", "body"], type))
         throw new Error("`bodyType` param must be and form, formData, json or body")
      this._request.bodyType = type
      return this
   }
   signPayload() {
      this._signData = true
      return this
   }
   transform(callback) {
      if (!_.isFunction(callback)) throw new Error("Transform must be an valid function")
      this._transform = callback
      return this
   }
   generateUUID() {
      this.setData({
         _uuid: Helpers.generateUUID()
      })
      return this
   }
   setHeaders(headers) {
      this._request.headers = _.extend(this._request.headers, headers || {})
      return this
   }
   removeHeader(name) {
      delete this._request.headers[name]
      return this
   }
   setUrl(url) {
      if (!_.isString(url) || !Helpers.isValidUrl(url))
         throw new Error("The `url` parameter must be valid url string")
      this._url = url
      return this
   }
   setResource(resource, data) {
      this._resource = resource
      this.setUrl(routes.getUrl(resource, data))
      return this
   }
   setLocalAddress(ipAddress) {
      this.setOptions({ localAddress: ipAddress }, true)
      return this
   }
   setCSRFToken(token) {
      this.setData({
         _csrftoken: token
      })
      return this
   }
   setSession(session) {
      if (!(session instanceof Session)) throw new Error("`session` parametr must be instance of `Session`")
      this._session = session
      this.setCSRFToken(session.CSRFToken)
      this.setOptions({
         jar: session.jar
      })
      if (session.device) this.setDevice(session.device)
      if (session.proxyUrl) this.setOptions({ proxy: session.proxyUrl })
      return this
   }
   setDevice(device) {
      if (!(device instanceof Device)) throw new Error("`device` parametr must be instance of `Device`")
      this._device = device
      this.setHeaders({
         "User-Agent": device.userAgent()
      })
      this.setData({
         device_id: device.id
      })
      return this
   }
   signData() {
      let that = this
      if (!_.includes(["POST", "PUT", "PATCH", "DELETE"], this._request.method))
         throw new Error("Wrong request method for signing data!")
      return signatures.sign(this._request.data).then(function(data) {
         that.setHeaders({
            "User-Agent": that.device.userAgent(data.appVersion)
         })
         return {
            signed_body: data.signature + "." + data.payload,
            ig_sig_key_version: data.sigKeyVersion
         }
      })
   }
   _prepareData() {
      let that = this
      return new Promise(function(resolve, reject) {
         if (that._request.method == "GET") return resolve({})
         if (that._signData) {
            that.signData().then(function(data) {
               let obj = {}
               obj[that._request.bodyType] = data
               resolve(obj)
            }, reject)
         } else {
            let obj = {}
            obj[that._request.bodyType] = that._request.data
            resolve(obj)
         }
      })
   }
   _mergeOptions(options) {
      let options = _.defaults(
         {
            method: this._request.method,
            url: this.url,
            resolveWithFullResponse: true,
            headers: this._request.headers
         },
         options || {},
         this._request.options
      )
      return Promise.resolve(options)
   }
   parseMiddleware(response) {
      if (response.req._headers.host === "upload.instagram.com" && response.statusCode === 201) {
         let loaded = /(\d+)-(\d+)\/(\d+)/.exec(response.body)
         response.body = { status: "ok", start: loaded[1], end: loaded[2], total: loaded[3] }
         return response
      }
      try {
         response.body = JSONbig.parse(response.body)
         return response
      } catch (err) {
         throw new Exceptions.ParseError(response, this)
      }
   }
   errorMiddleware(response) {
      response = this.parseMiddleware(response)
      let json = response.body
      if (json.spam) throw new Exceptions.ActionSpamError(json)
      if (json.message == "challenge_required") throw new Exceptions.CheckpointError(json, this.session)
      if (json.message == "login_required")
         throw new Exceptions.AuthenticationError("Login required to process this request")
      if (json.error_type == "sentry_block") throw new Exceptions.SentryBlockError(json)
      if (
         response.statusCode === 429 ||
         (_.isString(json.message) && json.message.toLowerCase().indexOf("too many requests") !== -1)
      )
         throw new Exceptions.RequestsLimitError()
      if (
         _.isString(json.message) &&
         json.message.toLowerCase().indexOf("not authorized to view user") !== -1
      )
         throw new Exceptions.PrivateUserError()
      throw new Exceptions.RequestError(json)
   }
   beforeParse(response, request, attemps) {
      return response
   }
   beforeError(error, request, attemps) {
      return error
   }
   afterError(error, request, attemps) {
      throw error
   }
   send(options, attemps) {
      let that = this
      if (!attemps) attemps = 0
      return this._mergeOptions(options)
         .then(function(opts) {
            return [opts, that._prepareData()]
         })
         .spread(function(opts, data) {
            opts = _.defaults(opts, data)
            return that._transform(opts)
         })
         .then(function(opts) {
            options = opts
            return [Request.requestClient(options), options, attemps]
         })
         .spread(_.bind(this.beforeParse, this))
         .then(_.bind(this.parseMiddleware, this))
         .then(function(response) {
            let json = response.body
            if (_.isObject(json) && json.status == "ok") return _.omit(response.body, "status")
            if (_.isString(json.message) && json.message.toLowerCase().indexOf("transcode timeout") !== -1)
               throw new Exceptions.TranscodeTimeoutError()
            throw new Exceptions.RequestError(json)
         })
         .catch(function(error) {
            return that.beforeError(error, options, attemps)
         })
         .catch(function(err) {
            if (err instanceof Exceptions.APIError) throw err
            if (!err || !err.response) throw err
            let response = err.response
            if (response.statusCode == 404) throw new Exceptions.NotFoundError(response)
            if (response.statusCode >= 500) {
               if (attemps <= that.attemps) {
                  attemps += 1
                  return that.send(options, attemps)
               } else {
                  throw new Exceptions.ParseError(response, that)
               }
            } else {
               that.errorMiddleware(response)
            }
         })
         .catch(function(error) {
            if (error instanceof Exceptions.APIError) throw error
            error = _.defaults(error, { message: "Fatal internal error!" })
            throw new Exceptions.RequestError(error)
         })
         .catch(function(error) {
            return that.afterError(error, options, attemps)
         })
   }
}

Request.requestClient = request.defaults({})
//usttekini silme bu kalsın
// If you need to perform loging or something like that!
// will also accept promise
