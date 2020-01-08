import { disableJavaScriptURLs } from "react-study/shared/ReactFeatureFlags";

const isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*\:/i;

let didWarn = false;

export default function sanitizeURL(url) {
  if (disableJavaScriptURLs) {
    // warn
  } else if (__DEV && !didWarn && isJavaScriptProtocol.test(url)) {
    didWarn = true;
    //warn
  }
}