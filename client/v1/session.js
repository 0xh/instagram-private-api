import Resource from "./resource"
import _ from "./lodash"
import request from "request-promise"
// fs cookie-storage yapılacak onlarda var burda
import RequestJar from "./jar"
import CONSTANTS from "./constants"
import Account from "./account"
import {AuthenticationError,AccountBanned,RequestsLimitError,CheckpointError,CookieNotValidError,RequestsLimitError} from "./exceptions"
import Request from "./request"
import Device from "./device"
import QE from "./qe"
import Megaphone from "./megaphone"
import Timeline from "./feeds/timeline-feed"
import Inbox from "./feeds/inbox"
import Thread from "./thread"
import Relationship from "./relationship"
import Helpers from "../../helpers"
//var fs = require('fs');
//var CookieStorage = require("./cookie-storage");

export default class Session extends Resource {
   constructor(device, storage, proxy) {
      super(device, storage, proxy)
      this.setDevice(device)
      this.setCookiesStorage(storage)
      if (_.isString(proxy) && !_.isEmpty(proxy)) this.proxyUrl = proxy
   }
   get jar() {
      return this._jar
   }
   set jar(val) {}
   get cookieStore() {
      return this._cookiesStore
   }
   set cookieStore(val) {}
   get device() {
      return this._device
   }
   set device(val) {}
   get CSRFToken() {
      var cookies = this.jar.getCookies(CONSTANTS.HOST)
      var item = _.find(cookies, { key: "csrftoken" })
      return item ? item.value : "missing"
   }
   set CSRFToken(val) {}
   get proxyUrl() {
      return this._proxyUrl
   }
   set proxyUrl(val) {
      if (!Helpers.isValidUrl(val) && val !== null) throw new Error("`proxyUrl` argument is not an valid url")
      this._proxyUrl = val
   }
   //bunu yazcaz
   setCookiesStorage(storage) {
      if (!(storage instanceof CookieStorage))
         throw new Error("`storage` is not an valid instance of `CookieStorage`")
      this._cookiesStore = storage
      this._jar = new RequestJar(storage.store)
      return this
   }
   setDevice(device) {
      if (!(device instanceof Device)) throw new Error("`device` is not an valid instance of `Device`")
      this._device = device
      return this
   }
   getAccountId() {
      var that = this
      return this._cookiesStore.getSessionId().then(function() {
         return that._cookiesStore.getAccountId()
      })
   }
   setProxy(url) {
      this.proxyUrl = url
      return this
   }
   getAccount() {
      var that = this
      return that.getAccountId().then(function(id) {
         return Account.getById(that, id)
      })
   }
   destroy() {
      var that = this
      return new Request(this)
         .setMethod("POST")
         .setResource("logout")
         .generateUUID()
         .send()
         .then(function(response) {
            that._cookiesStore.destroy()
            delete that._cookiesStore
            return response
         })
   }
   static login(session, username, password) {
      return new Request(session)
         .setResource("login")
         .setMethod("POST")
         .generateUUID()
         .setData({
            username: username,
            password: password,
            login_attempt_count: 0
         })
         .signPayload()
         .send()
         .catch(function(error) {
            if (error.name == "RequestError" && _.isObject(error.json)) {
               if (error.json.invalid_credentials) throw new AuthenticationError(error.message)
               if (error.json.error_type === "inactive user")
                  throw new AccountBanned(error.json.message + " " + error.json.help_url)
            }
            throw error
         })
         .then(function() {
            return [session, QE.sync(session)]
         })
         .spread(function(session) {
            var autocomplete = Relationship.autocompleteUserList(session).catch(
               RequestsLimitError,
               function() {
                  // autocompleteUserList has ability to fail often
                  return false
               }
            )
            return [session, autocomplete]
         })
         .spread(function(session) {
            return [session, new Timeline(session).get()]
         })
         .spread(function(session) {
            return [session, Thread.recentRecipients(session)]
         })
         .spread(function(session) {
            return [session, new Inbox(session).get()]
         })
         .spread(function(session) {
            return [session, Megaphone.logSeenMainFeed(session)]
         })
         .spread(function(session) {
            return session
         })
         .catch(CheckpointError, function(error) {
            // This situation is not really obvious,
            // but even if you got checkpoint error (aka captcha or phone)
            // verification, it is still an valid session unless `sessionid` missing
            return session
               .getAccountId()
               .then(function() {
                  // We got sessionId and accountId, we are good to go
                  return session
               })
               .catch(CookieNotValidError, function(e) {
                  throw error
               })
         })
   }
   static create(device, storage, username, password, proxy) {
      var that = this
      var session = new Session(device, storage)
      if (_.isString(proxy) && !_.isEmpty(proxy)) session.proxyUrl = proxy
      return session
         .getAccountId()
         .then(function() {
            return session
         })
         .catch(CookieNotValidError, function() {
            // We either not have valid cookes or authentication is not fain!
            return Session.login(session, username, password)
         })
   }
}

