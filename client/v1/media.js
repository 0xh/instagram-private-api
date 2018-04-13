//let fs = require('fs');
import Resource from "./resource"
import pruned from "./json-pruned"
import crypto from "crypto"
import request from "request-promise"
import Promise from "bluebird"
import Request from "./request"
import Comment from "./comment"
import Account from "./account"
import Location from "./location"
import {NotFoundError,RequestError,TranscodeTimeoutError} from "./exceptions"
import camelKeys from "camelcase-keys"

export default class Media extends Resource {
   constructor() {
      super()
   }
   parseParams(json) {
      let hash = camelKeys(json)
      let that = this
      hash.commentCount = hash.commentsDisabled ? 0 : json.comment_count
      hash.webLink = "https://www.instagram.com/p/" + json.code + "/"
      hash.carouselMedia = []
      if (_.isObject(json.location)) {
         let location = json.location
         location.location = Object.create(json.location)
         location.title = location.name
         location.subtitle = null
         this.location = new Location(that.session, location)
      }
      if (json.media_type === 2) {
         hash.video = {
            versions: json.video_versions,
            hasAudio: json.has_audio,
            duration: json.video_duration
         }
      }
      if (json.media_type === 8 && _.isArray(json.carousel_media)) {
         hash.carouselMedia = _.map(json.carousel_media, function(medium) {
            return new Media(that.session, medium)
         })
      }
      if (_.isObject(json.caption)) hash.caption = json.caption.text
      hash.takenAt = parseInt(json.taken_at) * 1000
      if (_.isObject(json.image_versions2)) {
         hash.images = json.image_versions2.candidates
      } else if (_.isObject(json.carousel_media)) {
         hash.images = json.carousel_media.map(function(media) {
            return media.image_versions2.candidates
         })
      }
      if (_.isArray(json.video_versions)) hash.videos = json.video_versions
      this.previewComments = _.map(json.preview_comments, function(comment) {
         return new Comment(that.session, comment)
      })
      // backward compability
      this.comments = this.previewComments
      this.account = new Account(that.session, json.user)
      return hash
   }
   getParams() {
      return _.extend(this._params, {
         account: this.account.params,
         comments: _.map(this.comments, "params"),
         location: this.location ? this.location.params : {},
         carouselMedia: _.map(this._params.carouselMedia, "params")
      })
   }
   static getById(session, id) {
      return new Request(session)
         .setMethod("GET")
         .setResource("mediaInfo", { mediaId: id })
         .send()
         .then(function(json) {
            return new Media(session, json.items[0])
         })
   }
   static getByUrl(session, url) {
      let self = this
      return request({
         url: "https://api.instagram.com/oembed/",
         qs: { url: url },
         json: true
      })
         .then(function(response) {
            return self.getById(session, response.media_id)
         })
         .catch(function(reason) {
            if (reason.error === "No URL Match") throw new NotFoundError("No URL Match")
            else throw reason
         })
   }
   static likers(session, mediaId) {
      return new Request(session)
         .setMethod("GET")
         .setResource("mediaLikes", { mediaId: mediaId })
         .send()
         .then(function(data) {
            return _.map(data.users, function(user) {
               return new Account(session, user)
            })
         })
   }
   static delete(session, mediaId) {
      return new Request(session)
         .setMethod("POST")
         .setResource("mediaDeletePhoto", { mediaId: mediaId })
         .setData({
            media_id: mediaId
         })
         .generateUUID()
         .signPayload()
         .send()
         .then(function(json) {
            if (json.did_delete) return
            throw new RequestError({
               messaage: "Not posible to delete medium!"
            })
         })
   }
   static edit(session, mediaId, caption, userTags) {
      let requestPayload = {
         media_id: mediaId,
         caption_text: caption
      }

      if (userTags) {
         requestPayload.usertags = JSON.stringify(userTags)
      }

      return new Request(session)
         .setMethod("POST")
         .setResource("mediaEdit", { mediaId: mediaId })
         .setData(requestPayload)
         .generateUUID()
         .signPayload()
         .send()
         .then(function(json) {
            if (json.media.caption_is_edited) {
               return new Media(session, json.media)
            }
            throw new RequestError({
               messaage: "Edit media not successful!"
            })
         })
   }
   static configurePhoto(session, uploadId, caption, width, height, userTags) {
      if (_.isEmpty(uploadId)) throw new Error("Upload argument must be upload valid upload id")
      if (!caption) caption = ""
      if (!width) width = 800
      if (!height) height = 800
      if (!userTags) userTags = {}

      const CROP = 1
      return session
         .getAccountId()
         .then(function(accountId) {
            let payload = pruned({
               source_type: "4",
               caption: caption,
               upload_id: uploadId,
               usertags: JSON.stringify(userTags),
               _uid: accountId.toString(),
               device: session.device.payload,
               edits: {
                  crop_original_size: ["$width", "$height"],
                  crop_center: ["$zero", "$negativeZero"],
                  crop_zoom: "$crop"
               },
               extra: {
                  source_width: width,
                  source_height: height
               }
            })
            payload = payload.replace(/\"\$width\"/gi, width.toFixed(1))
            payload = payload.replace(/\"\$height\"/gi, height.toFixed(1))
            payload = payload.replace(/\"\$zero\"/gi, (0).toFixed(1))
            payload = payload.replace(/\"\$negativeZero\"/gi, "-" + (0).toFixed(1))
            payload = payload.replace(/\"\$crop\"/gi, CROP.toFixed(1))

            return new Request(session)
               .setMethod("POST")
               .setResource("mediaConfigure")
               .setBodyType("form")
               .setData(JSON.parse(payload))
               .generateUUID()
               .signPayload()
               .send()
         })
         .then(function(json) {
            return new Media(session, json.media)
         })
   }
   static configureVideo(
      session,
      uploadId,
      caption,
      durationms,
      delay,
      {
         audio_muted = false,
         trim_type = 0,
         source_type = "camera",
         mas_opt_in = "NOT_PROMPTED",
         disable_comments = false,
         filter_type = 0,
         poster_frame_index = 0,
         geotag_enabled = false,
         camera_position = "unknown"
      } = {}
   ) {
      if (_.isEmpty(uploadId)) throw new Error("Upload argument must be upload valid upload id")
      if (typeof durationms === "undefined")
         throw new Error("Durationms argument must be upload valid video duration")
      let duration = durationms / 1000
      if (!caption) caption = ""
      if (!delay || typeof delay != "number") delay = 6500
      return Promise.delay(delay)
         .then(function() {
            return session.getAccountId()
         })
         .then(function(accountId) {
            let payload = pruned({
               video_result: "deprecated",
               audio_muted,
               trim_type,
               client_timestamp: String(new Date().getTime()).substr(0, 10),
               caption: caption,
               edits: {
                  filter_strength: 1
               },
               clips: [
                  {
                     length: duration,
                     cinema: "unsupported",
                     original_length: duration,
                     source_type,
                     start_time: 0,
                     trim_type,
                     camera_position: "back"
                  }
               ],
               _uid: accountId.toString(),
               source_type,
               mas_opt_in,
               length: duration,
               disable_comments,
               filter_type,
               poster_frame_index,
               geotag_enabled,
               camera_position,
               upload_id: uploadId.toString()
            })

            return new Request(session)
               .setMethod("POST")
               .setResource("videoConfigure")
               .setBodyType("form")
               .setData(JSON.parse(payload))
               .generateUUID()
               .signPayload()
               .send()
               .then(function(json) {
                  return new Media(session, json.media)
               })
               .catch(TranscodeTimeoutError, function(error) {
                  //Well, we just want to repeat our request. Dunno why this is happening and we should not let our users deal with this crap themselves.
                  return Media.configureVideo(session, uploadId, caption, durationms, delay)
               })
         })
   }
   static configureAlbum(session, uploadId, caption, width, height, userTags) {
      if (_.isEmpty(uploadId)) throw new Error("Upload argument must be upload valid upload id")
      if (!caption) caption = ""
      if (!width) width = 800
      if (!height) height = 800
      if (!userTags) userTags = {}

      const CROP = 1

      let payload = {
         source_type: "4",
         caption: caption,
         upload_id: uploadId,
         media_folder: "Instagram",
         device: session.device.payload,
         edits: {
            crop_original_size: [width.toFixed(1), height.toFixed(1)],
            crop_center: [(0).toFixed(1), "-" + (0).toFixed(1)],
            crop_zoom: CROP.toFixed(1)
         },
         extra: {
            source_width: width,
            source_height: height
         }
      }
      return Promise.resolve(payload)
   }
   static configureVideoAlbum(session, uploadId, caption, durationms, delay, width, height) {
      if (_.isEmpty(uploadId)) throw new Error("Upload argument must be upload valid upload id")
      if (typeof durationms === "undefined")
         throw new Error("Durationms argument must be upload valid video duration")
      let duration = durationms / 1000
      if (!caption) caption = ""
      if (!delay || typeof delay != "number") delay = 6500
      return Promise.delay(delay).then(function() {
         let payload = {
            filter_type: "0",
            source_type: "3",
            video_result: "deprecated",
            caption: caption,
            upload_id: uploadId,
            device: session.device.payload,
            length: duration,
            clips: [
               {
                  length: duration,
                  source_type: "3",
                  camera_position: "back"
               }
            ],
            audio_muted: false,
            poster_frame_index: 0,
            extra: {
               source_width: width,
               source_height: height
            }
         }

         return Promise.resolve(payload)
      })
   }
   static configureAlbum(session, medias, caption, disableComments) {
      let albumUploadId = new Date().getTime()

      caption = caption || ""
      disableComments = disableComments || false

      Promise.mapSeries(medias, function(media) {
         if (media.type === "photo") {
            return Media.configurePhotoAlbum(
               session,
               media.uploadId,
               caption,
               media.size[0],
               media.size[1],
               media.usertags
            )
         } else if (media.type === "video") {
            return Media.configureVideoAlbum(
               session,
               media.uploadId,
               caption,
               media.durationms,
               media.delay,
               media.size[0],
               media.size[1]
            )
         } else {
            throw new Error("Invalid media type: " + media.type)
         }
      }).then(function(results) {
         let params = {
            caption: caption,
            client_sidecar_id: albumUploadId,
            children_metadata: results
         }

         if (disableComments) {
            params["disable_comments"] = "1"
         }

         return new Request(session)
            .setMethod("POST")
            .setResource("mediaConfigureSidecar")
            .setBodyType("form")
            .setData(params)
            .generateUUID()
            .signPayload()
            .send()
      })
   }
}
