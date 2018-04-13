import _ from "lodash"
import routes from "./routes"

// Basic error
export class APIError extends Error {
   constructor() {
      super()
      this.name = "APIError"
      this.message = message || "Instagram API error was made."
   }
   serialize() {
      return {
         error: this.constructor.name,
         errorMessage: this.message
      }
   }
}
export class NotImplementedError extends APIError {
   constructor(message) {
      super(message)
      this.name = "NotImplementedError"
      this.message = message || "This method is actually not implemented"
   }
}
export class NotAbleToSignError extends APIError {
   constructor() {
      super()
      this.name = "NotAbleToSign"
      this.message = "It's not possible to sign request!"
   }
}
export class RequestError extends APIError {
   constructor(payload) {
      super(payload)
      this.name = "RequestError"
      this.message = "It's not possible to make request!"
      this.json = {}
      if (_.isString(payload.message)) this.message = payload.message
      if (_.isObject(payload)) {
         this.json = payload
      }
   }
}
export class AuthenticationError extends APIError {
   constructor(message) {
      super(message)
      this.name = "AuthenticationError"
      this.message = message || "Not possible to authenticate"
   }
}
export class ParseError extends APIError {
   constructor(response, request) {
      super(response, request)
      this.name = "ParseError"
      this.message = "Not possible to parse API response"
      this.response = response
      this.request = request
   }
   getUrl() {
      return this.request.url
   }
}
export class ActionSpamError extends APIError {
   constructor(json) {
      super(json)
      this.json = json
      this.name = "ActionSpamError"
      this.message = "This action was disabled due to block from instagram!"
   }
   serialize() {
      return _.extend(APIError.prototype.serialize.call(this), {
         errorData: {
            blockTime: this.getBlockTime(),
            message: this.getFeedbackMessage()
         }
      })
   }
   getBlockTime() {
      if (_.isObject(this.json) && _.isString(this.json.feedback_message)) {
         var hours = this.json.feedback_message.match(/(\d+)(\s)*hour(s)/)
         if (!hours || !_.isArray(hours)) return 0
         var blockTime = parseInt(hours[1]) * 60 * 60 * 1000
         return blockTime + 1000 * 60 * 5
      }
      return 0
   }
   getFeedbackMessage() {
      var message = "No feedback message"
      if (_.isString(this.json.feedback_message)) {
         var title = _.isString(this.json.feedback_title) ? this.json.feedback_title + ": " : ""
         message = title + this.json.feedback_message
      }
      return message
   }
}
export class CheckpointError extends APIError {
   constructor(json, session) {
      super(json, session)
      this.json = json
      this.name = "CheckpointError"
      this.message = "Instagram call checkpoint for this action!"
      if (_.isString(json.checkpoint_url)) this.url = json.checkpoint_url
      if (!this.url && _.isObject(json.checkpoint) && _.isString(json.checkpoint.url))
         this.url = json.checkpoint.url
      if (!this.url && _.isObject(json.challenge) && _.isString(json.challenge.url))
         this.url = json.challenge.url
      if (!this.url) this.url = routes.getWebUrl("challenge")
      this.session = session
   }
}

export class SentryBlockError extends APIError {
   constructor(json) {
      super(json)
      this.name = "SentryBlockError"
      this.message = "Sentry block from instagram"
      this.json = json
   }
}
export class OnlyRankedItemsError extends APIError {
   constructor() {
      super()
      this.name = "OnlyRankedItemsError"
      this.message = "Tag has only ranked items to show, due to blocked content"
   }
}
export class NotFoundError extends APIError {
   constructor(response) {
      super(response)
      this.name = "NotFoundError"
      this.message = "Page wasn't found!"
      this.response = response
   }
}
export class PrivateUserError extends APIError {
   constructor() {
      super()
      this.name = "PrivateUserError"
      this.message = "User is private and you are not authorized to view his content!"
   }
}
export class InvalidParamsError extends APIError {
   constructor(object) {
      super(object)
      this.name = "InvalidParamsError"
      this.message = "There was validation error and problem with input you supply"
      this.errorData = object
   }
   serialize() {
      var object = APIError.prototype.serialize.call(this)
      return _.extend(object, {
         errorData: this.errorData
      })
   }
}
export class TooManyFollowsError extends APIError {
   constructor() {
      super()
      this.name = "TooManyFollowsError"
      this.message = "Account has just too much follows"
   }
}
export class RequestsLimitError extends APIError {
   constructor() {
      super()
      this.name = "RequestsLimitError"
      this.message = "You just made too many request to instagram API"
   }
}
export class CookieNotValidError extends APIError {
   constructor() {
      super()
      this.name = "CookieNotValidError"
      this.message = "Cookie `" + cookieName + "` you are searching found was either not found or not valid!"
   }
}
export class IGAccountNotFoundError extends APIError {
   constructor() {
      super()
      this.name = "IGAccountNotFoundError"
      this.message = "Account you are searching for was not found!"
   }
}

export class ThreadEmptyError extends APIError {
   constructor() {
      super()
      this.name = "ThreadEmptyError"
      this.message = "Thread is empty there are no items!"
   }
}
export class AccountInactive extends APIError {
   constructor(accountInstance) {
      super(accountInstance)
      this.name = "AccountInactive"
      this.message = "The account you are trying to propagate is inactive"
      this.account = accountInstance
   }
}
export class AccountBanned extends APIError {
   constructor() {
      super()
      this.name = "AccountBanned"
      this.message = message
   }
}
export class AccountActivityPrivateFeed extends APIError {
   constructor() {
      super()
      this.name = "AccountActivityPrivateFeed"
      this.message = "The Account has private feed, account activity not really completed"
   }
}
export class PlaceNotFound extends APIError {
   constructor() {
      super()
      this.name = "PlaceNotFound"
      this.message = "Place you are searching for not exists!"
   }
}
export class NotPossibleToResolveChallenge extends APIError {
   constructor(reason, code) {
      super(reason, code)
      this.CODE = {
         RESET_NOT_WORKING: "RESET_NOT_WORKING",
         NOT_ACCEPTING_NUMBER: "NOT_ACCEPTING_NUMBER",
         INCORRECT_NUMBER: "INCORRECT_NUMBER",
         INCORRECT_CODE: "INCORRECT_CODE",
         UNKNOWN: "UNKNOWN",
         UNABLE_TO_PARSE: "UNABLE_TO_PARSE",
         NOT_ACCEPTED: "NOT_ACCEPTED"
      }
      this.name = "NotPossibleToResolveChallenge"
      this.reason = reason || "Unknown reason"
      this.code = code || this.CODE.UNKNOWN
      this.message = "Not possible to resolve challenge (" + reason + ")!"
   }
}
export class NotPossibleToVerify extends APIError {
   constructor() {
      super()
      this.name = "NotPossibleToVerify"
      this.message = "Not possible to verify trough code!"
   }
}
export class NoChallengeRequired extends APIError {
   constructor() {
      super()
      this.name = "NoChallengeRequired"
      this.message = "No challenge is required to use account!"
   }
}
export class InvalidEmail extends APIError {
   constructor(email, json) {
      super(email, json)
      this.name = "InvalidEmail"
      this.message = email + " email is not an valid email"
      this.json = json
   }
}

export class InvalidPhone extends APIError {
   constructor(phone, json) {
      super(phone, json)
      this.name = "InvalidPhone"
      this.message = phone + " phone is not a valid phone"
      this.json = json
   }
}

export class InvalidUsername extends APIError {
   constructor(username, json) {
      super(username, json)
      this.name = "InvalidUsername"
      this.message = username + " username is not an valid username"
      this.json = json
   }
}
export class InvalidPassword extends APIError {
   constructor() {
      super()
      this.name = "InvalidPassword"
      this.message = "Password must be at least 6 chars long"
   }
}

export class AccountRegistrationError extends APIError {
   constructor(message, json) {
      super(message, json)
      this.name = "AccountRegistrationError"
      this.message = message
      this.json = json
      if (_.isObject(json) && json.errors && !message) {
         this.message = ""
         for (var key in json.errors) {
            this.message += json.errors[key].join(". ")
         }
      }
   }
}
export class TranscodeTimeoutError extends APIError {
   constructor() {
      super()
      this.name = "TranscodeError"
      this.message = "Server did not transcoded uploaded video in time"
   }
}
export class MediaUnavailableError extends APIError {
   constructor() {
      super()
      this.name = "MediaUnavailableError"
      this.message = "Media is unavailable"
   }
}
