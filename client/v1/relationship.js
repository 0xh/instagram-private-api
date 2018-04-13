import _ from "lodash"
import Resource from "./resource"
import Request from "./request"
import Account from "./account"
import Exceptions from "./exceptions"

export default class Relationship extends Resource {
   constructor() {
      super()
   }
   setAccountId(accountId) {
      this.accountId = parseInt(accountId)
   }
   getParams() {
      return _.defaults(
         {
            accountId: this.accountId
         },
         this._params
      )
   }
   static get(session, accountId) {
      return new Request(session)
         .setMethod("GET")
         .setResource("friendshipShow", { id: accountId })
         .send()
         .then(function(data) {
            var relationship = new Relationship(session, data)
            relationship.setAccountId(accountId)
            return relationship
         })
   }
   static pendingFollowers(session) {
      return new Request(session)
         .setMethod("GET")
         .setResource("friendshipPending")
         .generateUUID()
         .signPayload()
         .send()
         .then(function(data) {
            return _.map(data.users, function(data, key) {
               var relationship = new Relationship(session, data)
               relationship.setAccountId(data.pk)
               return relationship
            })
         })
   }
   approvePending() {
      return Relationship.approvePending(this.session, this.accountId)
   }
   static approvePending(session, accountId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("friendshipPendingApprove", { id: accountId })
         .setData({
            user_id: accountId
         })
         .generateUUID()
         .signPayload()
         .send()
   }
   static getMany(session, accountIds) {
      return new Request(session)
         .setMethod("POST")
         .generateUUID()
         .setData({ user_ids: accountIds.join(",") })
         .setResource("friendshipShowMany")
         .send()
         .then(function(data) {
            return _.map(data.friendship_statuses, function(data, key) {
               var relationship = new Relationship(session, data)
               relationship.setAccountId(key)
               return relationship
            })
         })
   }
   static create(session, accountId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("follow", { id: accountId })
         .generateUUID()
         .setData({ user_id: accountId })
         .signPayload()
         .send()
         .then(function(data) {
            var relationship = new Relationship(session, data.friendship_status)
            relationship.setAccountId(accountId)
            return relationship
         })
         .catch(function(err) {
            if (
               err instanceof Exceptions.RequestError &&
               err.message.indexOf("following the max limit") !== -1
            ) {
               throw new Exceptions.TooManyFollowsError()
            } else {
               throw err
            }
         })
   }
   static destroy(session, accountId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("unfollow", { id: accountId })
         .generateUUID()
         .setData({ user_id: accountId })
         .signPayload()
         .send()
         .then(function(data) {
            var relationship = new Relationship(session, data.friendship_status)
            relationship.setAccountId(accountId)
            return relationship
         })
   }
   static autocompleteUserList(session) {
      return new Request(session)
         .setMethod("GET")
         .setResource("autocompleteUserList")
         .send()
         .then(function(json) {
            json.accounts = _.map(json.users, function(account) {
               return new Account(session, account)
            })
            json.expires = parseInt(json.expires * 1000)
            return json
         })
   }
   static block(session, accountId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("block", { id: accountId })
         .generateUUID()
         .setData({ user_id: accountId })
         .signPayload()
         .send()
         .then(function(data) {
            var relationship = new Relationship(session, data.friendship_status)
            relationship.setAccountId(accountId)
            return relationship
         })
   }
   block() {
      return Relationship.block(this.session, this.accountId)
   }
   static unblock(session, accountId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("unblock", { id: accountId })
         .generateUUID()
         .setData({ user_id: accountId })
         .signPayload()
         .send()
         .then(function(data) {
            var relationship = new Relationship(session, data.friendship_status)
            relationship.setAccountId(accountId)
            return relationship
         })
   }
   unblock(session, accountId) {
      return Relationship.unblock(this.session, this.accountId)
   }
}
