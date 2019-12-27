import SyntheticUIEvent from './SyntheticUIEvent';
import getEventModifierState from './getEventModifierState';

let previousScreenX = 0;
let previousScreenY = 0;

let isMovementXSet = false;
let isMovementYSet = false;

const SyntheticMouseEvent = SyntheticUIEvent.extend({
  screenX: null,
  screenY: null,
  clientX: null,
  clientY: null,
  pageX: null,
  pageY: null,
  ctrlKey: null,
  shiftKey: null,
  altKey: null,
  metaKey: null,
  getModifierState: getEventModifierState,
  button: null,
  buttons: null,
  relatedTarget(event) {
    return event.relatedTarget || (
      event.fromElement === event.srcElement ? event.toElement : event.fromElement
    );
  },
  movementX(event) { //  MouseEvent.movementX 是只读属性，它提供了当前事件和上一个mousemove事件之间鼠标在水平方向上的移动值。
    if ('movementX' in event) {
      return event.movementX;
    }

    const screenX = previousScreenX;
    previousScreenX = event.screenX;

    if (!isMovementXSet) {
      isMovementXSet = true;
      return 0;
    }

    return event.type === 'mousemove' ? event.screenX - screenX : 0;
  },
  movementY(event) {
    if ('movementY' in event) {
      return event.movementY;
    }

    const screenY = previousScreenY;
    previousScreenY = event.screenY;

    if (!isMovementYSet) {
      isMovementYSet = true;
      return 0;
    }

    return event.type === 'mousemove' ? event.screenY - screenY : 0;
  },
});

export default SyntheticMouseEvent;