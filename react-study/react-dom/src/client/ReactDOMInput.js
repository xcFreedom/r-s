import { setValueForProperty } from "./DOMPropertyOperations";
import { getToStringValue, toString } from "./ToStringValue";
import { disableInputAttributeSyncing } from "react-study/shared/ReactFeatureFlags";

function isContolled(props) {
  const usesChecked = props.type === 'checkbox' || props.type === 'radio';
  return usesChecked ? props.checked != null : props.value != null;
}

/**
 * 获取input元素的宿主props，就是增添一些默认的属性
 * @param {Element} element 
 * @param {Props} props 
 */
export function getHostProps(element, props) {
  const node = element;
  const checked = props.checked;

  const hostProps = Object.assing({}, props, {
    defaultChecked: undefined,
    defaultValue: undefined,
    value: undefined,
    checked: checked != null ? checked : node._wrapperState.initialChecked,
  });
  
  return hostProps;
}

/**
 * 为Element添加wrapperState属性，标记input的初始value，和是否为受控组件
 * @param {Element} element 
 * @param {Props} props 
 */
export function initWrapperState(element, props) {
  const node = element;
  const defaultValue = props.defaultValue == null ? '' : props.defaultValue;

  node._wrapperState = {
    initialChecked: props.checked != null ? props.checked : props.defaultChecked,
    initialValue: getToStringValue(props.value != null ? props.value : defaultValue),
    controlled: isContolled(props),
  }
}

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

/**
 * // TODO:有点不太懂
 * @param {Element} element 
 * @param {Object} props 
 * @param {boolean} isHydrating 
 */
export function postMountWrapper(element, props, isHydrating) {
  const node = element;
  // 如果已设置值，则不要分配该值。
  // 这可以防止用户文本输入在SSR hydration过程中丢失
  if (props.hasOwnProperty('value') || props.hasOwnProperty('defaultValue')) {
    const type = props.type;
    const isButton = type === 'submit' || type === 'react';

    // 避免在submit/reset button上设置属性，因为它会覆盖浏览器提供的默认值
    if (isButton && (props.value === undefined || props.value === null)) {
      return;
    }

    const initialValue = toString(node._wrapperState.initialValue);

    // 如果已设置值，则不要分配该值。
    // 这可以防止用户文本输入在SSR hydration过程中丢失
    if (!isHydrating) {
      if (disableInputAttributeSyncing) {
        // 暂时忽略
      } else {
        if (initialValue !== node.value) {
          node.value = initialValue;
        }
      }

      node.defaultValue = initialValue;
    }
  }

  // checkbox的name属性，有时设置defaultChecked会影响checked的值
  const name = node.name;
  if (name !== '') {
    node.name = '';
  }
  node.defaultChecked = !node.defaultChecked;
  node.defaultChecked = !!node._wrapperState.initialChecked;

  if (name !== '') {
    node.name = name;
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