<<<<<<< HEAD
'use strict';

let DEFAULT_MAX_DEPTH = 6;
let DEFAULT_ARRAY_MAX_LENGTH = 50;
let seen; // Same variable used for all stringifications

Date.prototype.toPrunedJSON = Date.prototype.toJSON;
String.prototype.toPrunedJSON = String.prototype.toJSON;

let cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    meta = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    };
=======
const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_ARRAY_MAX_LENGTH = 50;

const escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

// table of character substitutions
const meta = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '"': '\\"',
    '\\': '\\\\'
};
>>>>>>> 70e26a8991db0a4cb50a3209872c24f5e6871cfb

function quote(string) {
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        const c = meta[a];
        return typeof c === 'string'
            ? c
            : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder, depthDecr, arrayMaxLength) {
    let value = holder[key];
    let seen = [];

    if (value && ~[Date, String].indexOf(value.constructor)) {
        value = value.toJSON(key);
    }

    if (typeof value === 'string') {
        return quote(value);
    }

    if (typeof value === 'number') {
        return isFinite(value) ? String(value) : 'null';
    }

    if (value === null || typeof value === 'boolean') {
        return String(value);
    }

    if (typeof value === 'object') {
        if (!value) {
            return 'null';
        }

        if (depthDecr <= 0 || seen.indexOf(value) !== -1) {
            return '"-pruned-"';
        }

        seen.push(value);

        let partial = [];

        if (Array.isArray(value)) {
            let length = Math.min(value.length, arrayMaxLength);

            for (let i = 0; i < length; i += 1) {
                partial[i] = str(i, value, depthDecr - 1, arrayMaxLength) || 'null';
            }

            return partial.length === 0
                ? '[]'
                : '[' + partial.join(',') + ']';
        }

        for (let k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
                try {
                    let v = str(k, value, depthDecr - 1, arrayMaxLength);

                    if (v) {
                        partial.push(quote(k) + ':' + v);
                    }
                } catch (e) {
                    // this try/catch due to some "Accessing selectionEnd on an input element that cannot have a selection." on Chrome
                }
            }
        }

        return partial.length === 0
            ? '{}'
            : '{' + partial.join(',') + '}';
    }
}

export default function (
    value,
    depthDecr = DEFAULT_MAX_DEPTH,
    arrayMaxLength = DEFAULT_ARRAY_MAX_LENGTH
) {
    return str('', { '': value }, depthDecr, arrayMaxLength);
}
