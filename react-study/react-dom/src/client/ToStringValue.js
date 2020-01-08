import { enableTrustedTypesIntegration } from "react-study/shared/ReactFeatureFlags";

export function toString(value) {
  return '' + value;
}

export function getToStringValue(value) {
  switch (typeof value) {
    case 'boolean':
    case 'number':
    case 'object':
    case 'string':
    case 'undefined':
      return value;
    default:
      return '';
  }
}

export let toStringOrTrustedType = toString;

if (enableTrustedTypesIntegration && trustedTypes !== 'undefined') {
  toStringOrTrustedType = value => {
    if (
      typeof value === 'object' &&
      (trustedTypes.isHTML(value) ||
        trustedTypes.isScript(value) ||
        trustedTypes.isScriptURL(value) ||
        (trustedTypes.isURL && trustedTypes.isURL(value)))
    ) {
      return value;
    }
    return toString(value);
  }
}