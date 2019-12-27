import { getFiberCurrentPropsFromNode } from './EventPluginUtils';

function isInteractive(tag) {
  return (
    tag === 'button' ||
    tag === 'input' ||
    tag === 'select' ||
    tag === 'textarea'
  );
}

function shouldPreventMouseEvent(name, type, props) {
  switch (name) {
    case 'onClick':
    case 'onClickCapture':
    case 'onDoubleClick':
    case 'onDoubleClickCapture':
    case 'onMouseDown':
    case 'onMouseDownCapture':
    case 'onMouseMove':
    case 'onMouseMoveCapture':
    case 'onMouseUp':
    case 'onMouseUpCapture':
      return !!(props.disabled && isInteractive(type));
    default:
      return false;
  }
}

export function getListener(inst, registrationName) {
  let listener;

  const stateNode = inst.stateNode;
  if (!stateNode) {
    // work in progress(例如：以增量模式加载events)
    return null;
  }
  const props = getFiberCurrentPropsFromNode(stateNode);
  if (!props) {
    // Work in progress
    return null;
  }

  listener = props[registrationName];
  if (shouldPreventMouseEvent(registrationName, inst.type, props)) { // 某些表单类型element，设置disabled后不应该触发某些事件。
    return null;
  }
  return listener;
}