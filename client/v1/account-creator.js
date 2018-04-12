import _ from "lodash"
import crypto from "crypto"
import Resource from "./resource"
import Helpers from "../../helpers"
import clean from "underscore.string/clean"

import Exceptions from "./exceptions"
import QE from "qe"
import Relationship from "./relationship"
import discover from "./discover"
import Request from "./request"
import Thread from "./thread"
import Session from "./session"
import Account from "./account"

export default class AccountCreator {
   constructor(session, type) {
      if (!(session instanceof Session))
         throw new Error("AccounCreator needs valid session as first argument")
      this.session = session
      if (!_.includes(["phone", "email"], type))
         throw new Error("AccountCreator class needs either phone or email as type")
      this.type = type
   }

   setUsername(username) {
      username = username.toLowerCase()
      if (!username || !/^[a-z0-9\._]{1,50}$/.test(username)) {
         throw new Exceptions.InvalidUsername(username)
      }
      this.username = username
      return this
   }
   setName(name) {
      this.name = name
      return this
   }
   setPassword(password) {
      if (!password || password.length < 6) throw new Exceptions.InvalidPassword()
      this.password = password
      return this
   }
   checkUsername(username) {
      return new Request(this.session)
         .setMethod("POST")
         .setResource("checkUsername")
         .setData({ username: username })
         .signPayload()
         .send()
   }
   usernameSuggestions(username) {
      return new Request(this.session)
         .setMethod("POST")
         .setResource("usernameSuggestions")
         .setData({
            name: username
         })
         .signPayload()
         .send()
   }
   validateUsername() {
      let username = this.username
      let self = this
      if (!username) return Promise.reject(new Exceptions.InvalidUsername("Empty"))
      return this.checkUsername(username)
         .then(function(json) {})
         .catch(Exceptions.InvalidUsername, function(e) {
            return self.usernameSuggestions(username).then(function(json) {
               e.json.suggestions = json.suggestions
               throw e
            })
         })
   }
   autocomplete(account) {
      const session = this.session
      return QE.sync(session)
         .then(function() {
            var autocomplete = Relationship.autocompleteUserList(session).catch(
               Exceptions.RequestsLimitError,
               function() {
                  // autocompleteUserList has ability to fail often
                  return false
               }
            )
            return [account, autocomplete]
         })
         .spread(function(account) {
            return [account, Thread.recentRecipients(session)]
         })
         .spread(function(account) {
            return [account, discover(session, true)]
         })
   }
   validate() {
      throw new Error("Please override this method in order to validate account")
   }
   create() {
      throw new Error("Please override this method in order to register account")
   }
   register() {
      var args = _.toArray(arguments)
      var self = this
      return self
         .validate()
         .then(function() {
            return self.create.apply(self, args)
         })
         .then(function(account) {
            return self.autocomplete(account)
         })
   }
}
export default class AccountPhoneCreator extends AccountCreator {
    constructor(session) {
        super(session)
        AccountCreator.call(this, session, "phone")
    }
    setPhone(phone) {
        if (!phone || !/^([0-9\(\)\/\+ \-]*)$/.test(phone)) throw new Exceptions.InvalidPhone(phone)
        this.phone = phone
        return this
    }
    setPhoneCallback(callback) {
        if (!_.isFunction(callback)) throw new Error("Callback must be function which returns promise")
        this.phoneCallback = callback
        return this
    }
    validate() {
        if (!this.phoneCallback) throw new Error("You must call `setPhoneCallback` and supply callback")
        return this.validateUsername
    }
    create() {
        var that = this
        return new Request(that.session)
        .setMethod("POST")
        .setResource("registrationSMSCode")
        .setData({
           phone_number: that.phone
        })
        .signPayload()
        .send()
        .then(function(json) {
           return that.phoneCallback()
        })
        .then(function(code) {
            if (!_.isString(code) && !_.isNumber(code))
               throw new Exceptions.AccountRegistrationError("Code is invalid")
            code = clean(code.toString().trim()).replace(/\s+/, "")
            if (code.toString().length !== 6) throw new Error("Code must be 6 digits number")
            return [
               new Request(that.session)
                  .setMethod("POST")
                  .setResource("registrationValidateSMSCode")
                  .setData({
                     phone_number: that.phone,
                     verification_code: code
                  })
                  .signPayload()
                  .send(),
               code
            ]
         })
         .spread(function(json, code) {
            if (!json.verified) throw new Exceptions.AccountRegistrationError("Code is invalid", json)
            return new Request(that.session)
               .setMethod("POST")
               .setResource("registrationCreateValidated")
               .setData({
                  password: that.password,
                  username: that.username,
                  phone_number: that.phone,
                  verification_code: code,
                  first_name: that.name,
                  force_sign_up_code: "",
                  qs_stamp: "",
                  phone_id: Helpers.generateUUID(),
                  guid: Helpers.generateUUID(),
                  waterfall_id: Helpers.generateUUID()
               })
               .signPayload()
               .send()
         })
         .then(function(json) {
            if (!json.account_created) throw new Exceptions.AccountRegistrationError(null, json)
            return new Account(that.session, json.created_user)
         })
    }
}
export default class AccountEmailCreator extends AccountCreator {
    constructor(session) {
        super(session)
        AccountCreator.call(this, session, "email")
    }
    setEmail(email) {
        if (!email || !Helpers.validateEmail(email)) throw new Exceptions.InvalidEmail(email)
        this.email = email
        return this
    }
    checkEmail(){
        return new Request(this.session)
        .setMethod("POST")
        .setResource("checkEmail")
        .setData({
           email: this.email,
           qe_id: Helpers.generateUUID()
        })
        .signPayload()
        .send()
    }
    validate() {
        let email = this.email
        let validateEmail = _.bind(this.checkEmail, this)
        if (!email || !Helpers.validateEmail(email))
           return Promise.reject(new Exceptions.InvalidEmail(email))
        return this.validateUsername()
           .then(function() {
              return validateEmail()
           })
           .then(function(json) {
              if (!json.available || !json.valid)
                 return Promise.reject(new Exceptions.InvalidEmail(email))
              return true
           })
    }
    create() {
        var uuid = Helpers.generateUUID()
        var guid = Helpers.generateUUID()
        var that = this
        return new Request(that.session)
           .setMethod("POST")
           .setResource("registrationCreate")
           .setData({
              phone_id: uuid,
              username: that.username,
              first_name: that.name,
              guid: guid,
              email: that.email,
              force_sign_up_code: "",
              qs_stamp: "",
              password: that.password
           })
           .signPayload()
           .send()
           .then(function(json) {
              if (!json.account_created) throw new Exceptions.AccountRegistrationError(null, json)
              return new Account(that.session, json.created_user)
           })
    }
}
