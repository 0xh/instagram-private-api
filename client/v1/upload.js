import _ from 'lodash';
import Resource from './resource';
import * as Helpers from '../../helpers';
import Promise from 'bluebird';
import camelKeys from 'camelcase-keys';

import Exceptions from './exceptions';
import Request from './request';

export default class Upload extends Resource {

    static photo(session, streamOrPathOrBuffer, uploadId, name, isSidecar) {
        const data = Buffer.isBuffer(streamOrPathOrBuffer) ? streamOrPathOrBuffer : Helpers.pathToStream(streamOrPathOrBuffer);

        // This compresion is just default one
        const compresion = {
            "lib_name": "jt",
            "lib_version": "1.3.0",
            "quality": "92"
        }

        const isThumbnail = !!uploadId;
        const predictedUploadId = uploadId || new Date().getTime();
        const filename = (name || "pending_media_") + predictedUploadId + ".jpg"
        const request = new Request(session)

        const fields = {
            image_compression: JSON.stringify(compresion),
            upload_id: predictedUploadId
        };

        if (isSidecar) {
            fields['is_sidecar'] = 1;
            if (isThumbnail) {
                fields['media_type'] = 2;
            }
        }

        const response = await request.setMethod('POST')
            .setResource('uploadPhoto')
            .generateUUID()
            .setData(fields)
            .transform(function (opts) {
                opts.formData.photo = {
                    value: data,
                    options: {
                        filename: filename,
                        contentType: 'image/jpeg'
                    }
                }
                return opts;
            })
            .send()

        return new Upload(session, response);
    }

    // Probably not the best way to upload video, best to use stream not to store full video in memory, but it's the easiest
    static video(session, videoBufferOrPath, photoStreamOrPath, isSidecar) {

        const predictedUploadId = new Date().getTime();

        const request = new Request(session);

        const buffer = await Helpers.pathToBuffer(videoBufferOrPath)
        const duration = _getVideoDurationMs(buffer);

        if (duration > 63000) {
            throw new Error('Video is too long. Maximum is 63 seconds. Got: ' + Math.ceil(duration / 1000));
        }

        const fields = {
            upload_id: predictedUploadId,
        };

        if (isSidecar) {
            fields.is_sidecar = 1;
        } else {
            fields.media_type = 2;
            fields.upload_media_duration_ms = Math.floor(duration);
            fields.upload_media_height = 720;
            fields.upload_media_width = 720;
        }

        const json = await request
            .setMethod('POST')
            .setBodyType('form')
            .setResource('uploadVideo')
            .generateUUID()
            .setData(fields)
            .send()

        const uploadResponse = await new Upload(session, json)

        //Uploading video to url
        const sessionId = _generateSessionId(uploadResponse.params.uploadId);
        const chunkLength = 204800;
        const chunks = [];

        chunks.push(
            {
                data: buffer.slice(0, chunkLength),
                range: 'bytes ' + 0 + '-' + (chunkLength - 1) + '/' + buffer.length
            },
            {
                data: buffer.slice(chunkLength, buffer.length),
                range: 'bytes ' + chunkLength + '-' + (buffer.length - 1) + '/' + buffer.length
            }
        );

        chunks = chunks.map(chunk => {
            return await _sendChunkedRequest(session, uploadResponse.params.uploadUrl, uploadResponse.params.uploadJob, sessionId, chunk.data, chunk.range, isSidecar)
        })

        const videoUploadResult = chunks[chunks.length - 1];
        const uploadData = {
            delay: videoUploadResult.configure_delay_ms,
            durationms: duration,
            uploadId: uploadResponse.params.uploadId
        }

        await Upload.photo(session, photoStreamOrPath, uploadData.uploadId, "cover_photo_", isSidecar)

        return uploadData;
    }

    static album(session, medias, caption, disableComments) {
        const uploadPromises = [];

        if (medias.length < 2 || medias.length > 10) {
            throw new Error('Invalid album size');
        }

        for (let media of medias) {
            if (['photo', 'video'].indexOf(media.type) === -1) {
                throw new Error('Invalid media type: ' + media.type);
            }

            if (!media.data) {
                throw new Error('Data not specified.');
            }

            if (!media.size) {
                throw new Error('Size not specified.');
            }

            if (media.type === 'video', !media.thumbnail) {
                throw new Error('Thumbnail not specified.');
            }

            const aspect_ratio = Number((media.size[0] / media.size[1]).toFixed(2));

            if (aspect_ratio < 0.8 || aspect_ratio > 1.91) {
                throw new Error('Invalid media aspect ratio.');
            }

            if (media.type === 'photo') {
                uploadPromises.push(
                    Upload.photo(session, media.data, undefined, undefined, true)
                        .then(function (payload) {
                            return {
                                uploadId: payload.params.uploadId,
                                ...media,
                            };
                        })
                )
            }

            if (media.type === 'video') {
                uploadPromises.push(
                    Upload.video(session, media.data, media.thumbnail, true)
                        .then(function (payload) {
                            return { ...payload, ...media };
                        })
                )
            }
        }

        return Promise.all(uploadPromises);
    }

    parseParams(json) {
        const hash = camelKeys(json);

        if (json.video_upload_urls && json.video_upload_urls.length) {
            hash.uploadUrl = json.video_upload_urls[0].url;
            hash.uploadJob = json.video_upload_urls[0].job;
        }

        return hash;
    }
}

function _getVideoDurationMs(buffer) {
    var start = buffer.indexOf(new Buffer('mvhd')) + 17;
    var timeScale = buffer.readUInt32BE(start, 4);
    var duration = buffer.readUInt32BE(start + 4, 4);
    var movieLength = duration / timeScale;

    return movieLength * 1000;
}

function _sendChunkedRequest(session, url, job, sessionId, buffer, range, isSidecar) {
    var headers = {
        'job': job,
        'Host': 'upload.instagram.com',
        'Session-ID': sessionId,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename=\\\"video.mov\\\"',
        'Content-Length': buffer.length,
        'Content-Range': range
    };
    if (isSidecar) {
        headers['Cookie'] = 'sessionid=' + sessionId;
    }
    return new Request(session)
        .setMethod('POST')
        .setBodyType('body')
        .setUrl(url)
        .generateUUID()
        .setHeaders(headers)
        .transform(function (opts) {
            opts.body = buffer;
            return opts;
        })
        .send()
}

function _generateSessionId(uploadId) {
    var text = (uploadId || "") + '-';
    var possible = "0123456789";

    for (var i = 0; i < 9; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}