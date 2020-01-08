import {
  getPropertyInfo,
  shouldIgnoreAttribute,
  isAttributeNameSafe,
  BOOLEAN,
  OVERLOADED_BOOLEAN,
} from "../shared/DOMProperty";
import { toStringOrTrustedType } from "./ToStringValue";
import { setAttribute, setAttributeNS } from "./setAttribute";
import sanitizeURL from "../shared/sanitizeURL";

/**
 * 设置dom节点属性
 * @param {Element} node 
 * @param {string} name 
 * @param {any} value 
 * @param {boolean} isCustomComponentTag 
 */
export function setValueForProperty(node, name, value, isCustomComponentTag) {
  const propertyInfo = getPropertyInfo(name);
  if (shouldIgnoreAttribute(name, propertyInfo, isCustomComponentTag)) {
    return;
  }
  if (shouldRemoveAttribute(name, value, propertyInfo, isCustomComponentTag)) {
    value = null;
  }
  // 如果道具不在特殊列表中，则将其视为简单属性。
  if (isCustomComponentTag || propertyInfo === null) {
    if (isAttributeNameSafe(name)) {
      const attributeName = name;
      if (value === null) {
        node.removeAttribute(attributeName);
      } else {
        setAttribute(node, attributeName, toStringOrTrustedType(value));
      }
    }
    return;
  }
  const { mustUseProperty } = propertyInfo;
  if (mustUseProperty) {
    const { propertyName } = propertyInfo;
    if (value === null) {
      const { type } = propertyInfo;
      node[propertyName] = type === BOOLEAN ? false : '';
    } else {
      node[propertyName] = value;
    }
    return;
  }

  // 其余的作为特殊情况的属性处理。
  const { attributeName, attributeNamespace } = propertyInfo;
  if (value === null) {
    node.removeAttribute(attributeName);
  } else {
    const { type } = propertyInfo;
    let attributeValue;
    if (type === BOOLEAN || (type === OVERLOADED_BOOLEAN && value === true)) {
      attributeValue = '';
    } else {
      attributeValue = toStringOrTrustedType(value);
      if (propertyInfo.sanitizeURL) {
        sanitizeURL(attributeValue.toString());
      }
    }

    if (attributeNamespace) {
      setAttributeNS(node, attributeNamespace, attributeName, attributeValue);
    } else {
      setAttribute(node, attributeName, attributeValue);
    }
  }
}