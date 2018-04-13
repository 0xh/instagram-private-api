import _ from 'lodash';
import Promise from 'bluebird';
import Exceptions from './exceptions';
import hmac from 'crypto-js/hmac-sha256';
import * as CONSTANTS from './constants';
import pruned from './json-pruned';

export function sign(payload) {
    const key = CONSTANTS.PRIVATE_KEY;
    const json = _.isString(payload) ? payload : pruned(payload);
    const signed = hmac(json, key.SIG_KEY);

    return Promise.resolve({
        signature: signed.toString(),
        appVersion: key.APP_VERSION,
        sigKeyVersion: key.SIG_VERSION,
        payload: json,
    })
}
