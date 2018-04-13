import CONSTANTS from "./constants"
import tough from "tough-cookie"
//tough react-native'de calısmayabilir ******************************************
let CookieJar = tough.CookieJar
// We need to trick the request.js library on order 
// to get cookies from i.instagram.com instead of www.instagram.com
export default class RequestJar {
    constructor(){
        super()
        let self = this
        self._jar = new CookieJar(store, {looseMode: true});
    }
    rewriteUri(uri) {
        uri = uri.replace(CONSTANTS.WEB_HOSTNAME, CONSTANTS.HOSTNAME);
        uri = uri.replace('://' + CONSTANTS.TLD, '://' + CONSTANTS.HOSTNAME);
        return uri;
    }
    setCookie(cookieOrStr,uri,options) {
        let self = this
        uri  = tnis.rewriteUri(uri)
        return self._jar.setCookieSync(cookieOrStr,uri,options || {})
    }
    getCookieString(uri) {
        let self = this
        uri  = this.rewriteUri(uri)
        return self._jar.getCookieStringSync(uri)
    }
    getCookies(uri) {
        let self = this
        uri = this.rewriteUri(uri)
        return self._jar.getCookiesSync(uri)
    }
}
