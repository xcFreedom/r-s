import SyntheticUIEvent from './SyntheticUIEvent';
import getEventModifierState from './getEventModifierState';

const SyntheticTouchEvent = SyntheticUIEvent.extend({
  touches: null,
  targetTouches: null,
  changedTouches: null,
  altKey: null,
  metaKey: null,
  ctrlKey: null,
  shiftKey: null,
  getModifierState: getEventModifierState,
});

export default SyntheticTouchEvent;