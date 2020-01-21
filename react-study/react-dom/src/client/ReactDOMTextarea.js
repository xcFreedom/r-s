import { getToStringValue, toString } from "./ToStringValue";

export function getHostProps(element, props) {
  const node = element;

  const hostProps = {
    ...props,
    value: undefined,
    defaultValue: undefined,
    children: toString
  }
}

/**
 * 
 * @param {Element} element 
 * @param {Props} props 
 */
export function initWrapperState(element, props) {
  const node = element;

  let initialValue = props.value;

  // 如果我们要使用默认值，只需要获取默认值
  if (initialValue == null) {
    let defaultValue = props.defaultValue;
    let children = props.children;
    if (children != null) { // 对于textarea元素。。。children会被当成defaultValue使用，牛逼。。。
      if (Array.isArray(children)) {
        children = children[0];
      }
      defaultValue = children;
    }
    if (defaultValue == null) {
      defaultValue = '';
    }
    initialValue = defaultValue;
  }

  node._wrapperState = {
    initialValue: getToStringValue(initialValue),
  };
}

export function updateWrapper(element, props) {
  const node = element;
  const value = getToStringValue(props.value);
  const defaultValue = getToStringValue(props.defaultValue);
  if (value != null) {
    // Cast `value` to a string to ensure the value is set correctly. While
    // browsers typically do this as necessary, jsdom doesn't.
    const newValue = toString(value);
    // To avoid side effects (such as losing text selection), only set value if changed
    if (newValue !== node.value) {
      node.value = newValue;
    }
    if (props.defaultValue == null && node.defaultValue !== newValue) {
      node.defaultValue = newValue;
    }
  }
  if (defaultValue != null) {
    node.defaultValue = toString(defaultValue);
  }
}

export function postMountWrapper(element, props) {
  const node = element;

  const textContent = node.textContent;

  if (textContent === node._wrapperState.initialValue) {
    if (textContent !== '' && textContent !== null) {
      node.value = textContent;
    }
  }
}