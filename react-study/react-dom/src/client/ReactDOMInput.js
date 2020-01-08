import { setValueForProperty } from "./DOMPropertyOperations";
import { getToStringValue, toString } from "./ToStringValue";
import { disableInputAttributeSyncing } from "react-study/shared/ReactFeatureFlags";

export function updateChecked(element, props) {
  const node = element;
  const checked = props.checked;
  if (checked != null) {
    setValueForProperty(node, 'checked', checked, false);
  }
}

export function updateWrapper(element, props) {
  const node = element;

  updateChecked(element, props);

  const value = getToStringValue(props.value);
  const type = props.type;

  if (value != null) {
    if (type === 'number') {
      if (
        (value === 0 && node.value === '') ||
        node.value != value
      ) {
        node.value = toString(value);
      }
    } else if (node.value !== toString(value)) {
      node.value = toString(value);
    }
  } else if (type === 'submit' || type === 'reset') {
    // 提交/重置输入需要完全删除属性，以避免出现空白文本按钮。
    node.removeAttribute('value');
    return;
  }

  if (disableInputAttributeSyncing) {
    // 当不同步value属性时，React只在defaultValue React prop发生更改时分配新值。当不存在时，React什么也不做
    if (props.hasOwnProperty('defaultValue')) {
      setDefaultValue(node, props.type, getToStringValue(props.defaultValue));
    }
  } else {
    /**
     * 同步值属性时，该值来自属性的级联：

        //一。值反应属性

        //2。defaultValue React属性

        //三。否则就不会有变化
     */
    if (props.hasOwnProperty('value')) {
      setDefaultValue(node, props.type, value);
    } else if (props.hasOwnProperty('defaultValue')) {
      setDefaultValue(node, props.type, getToStringValue(props.defaultValue));
    }
  }

  if (disableInputAttributeSyncing) {
    if (props.defaultChecked == null) {
      node.removeAttribute('checked');
    } else {
      node.defaultChecked = !!props.defaultChecked;
    }
  } else {
    if (props.checked == null && props.defaultChecked != null) {
      node.defaultChecked = !!props.defaultChecked;
    }
  }
}

export function setDefaultValue(node, type, value) {
  if (
    type !== 'number' ||
    node.ownerDocument.activeElement !== node
  ) {
    if (value == null) {
      node.defaultValue = toString(node._wrapperState.initialValue);
    } else if (node.defaultValue !== toString(value)) {
      node.defaultValue = toString(value);
    }
  }
}