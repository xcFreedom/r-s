import { toString, getToStringValue } from "./ToStringValue";

export function getHostProps(element, props) {
  return Object.assign({}, props, { value: undefined });
}

/**
 * 为select组件添加_wrapperState，标记select初始是否多选
 * @param {Element} element 
 * @param {Props} props 
 */
export function initWrapperState(element, props) {
  const node = element;

  node._wrapperState = {
    wasMultiple: !!props.multiple,
  };
}

function updateOptions(node, multiple, propValue, setDefaultSelected) {
  const options = node.options;
  if (multiple) {
    let selectedValues = propValue;
    let selectedValue = {};
    for (let i = 0; i < selectedValues.length; i++) {
      selectedValue['$' + selectedValues[i]] = true;
    }
    for (let i = 0; i < options.length; i++) {
      const selected = selectedValue.hasOwnProperty('$' + options[i].value);
      if (options[i].selected !== selected) {
        options[i].selected = selected;
      }
      if (selected && setDefaultSelected) {
        options[i].defaultSelected = true;
      }
    }
  } else {
    let selectedValue = toString(getToStringValue(propValue));
    let defaultSelected = null;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === selectedValue) {
        options[i].selected = true;
        if (setDefaultSelected) {
          options[i].defaultSelected = true;
        }
        return;
      }
      if (defaultSelected === null && !options[i].disabled) {
        defaultSelected = options[i];
      }
    }

    if (defaultSelected !== null) {
      defaultSelected.selected = true;
    }
  }
}

export function postMountWrapper(element, props) {
  const node = element;
  node.multiple = !!props.multiple;
  const value = props.value;
  if (value != null) {
    updateOptions(node, !!props.multiple, value, false);
  } else if (props.defaultValue != null) {
    updateOptions(node, !!props.multiple, props.defaultValue, true);
  }
}

export function postUpdateWrapper(element, props) {
  const node = element;
  const wasMultiple = node._wrapperState.wasMultiple;
  node._wrapperState.wasMultiple = !!props.multiple;

  const value = props.value;
  if (value != null) {
    updateOptions(node, !!props.multiple, value, false);
  } else if (wasMultiple !== !!props.multiple) {
    if (props.defaultValue != null) {
      updateOptions(node, !!props.multiple, props.defaultValue, true);
    } else {
      updateOptions(node, !!props.multiple, props.multiple ? [] : '', false);
    }
  }
}