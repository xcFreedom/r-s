import {
  DiscreteEvent,
  UserBlockingEvent,
  ContinuousEvent,
} from '../../../shared/ReactTypes';
import { accumulateTwoPhaseDispatches } from '../../../legacy-events/EventPropagators';
import * as DOMTopLevelEventTypes from './DOMTopLevelEventTypes';
import getEventCharCode from './getEventCharCode';
import SyntheticKeyboardEvent from './SyntheticKeyboardEvent';
import SyntheticFocusEvent from './SyntheticFocusEvent';
import SyntheticMouseEvent from './SyntheticMouseEvent';
import SyntheticTouchEvent from './SyntheticTouchEvent';
import SyntheticAnimationEvent from './SyntheticAnimationEvent';
import SyntheticTransitionEvent from './SyntheticTransitionEvent';
import SyntheticUIEvent from './SyntheticUIEvent';
import SyntheticWheelEvent from './SyntheticWheelEvent';
import SyntheticClipboardEvent from './SyntheticClipboardEvent';
import SyntheticPointerEvent from './SyntheticPointerEvent';
import SyntheticEvent from '../../../legacy-events/SyntheticEvent';

const eventTuples = [
  // Discrete events
  [DOMTopLevelEventTypes.TOP_BLUR, 'blur', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_CANCEL, 'cancel', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_CLICK, 'click', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_CLOSE, 'close', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_CONTEXT_MENU, 'contextMenu', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_COPY, 'copy', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_CUT, 'cut', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_AUX_CLICK, 'auxClick', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_DOUBLE_CLICK, 'doubleClick', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_DRAG_END, 'dragEnd', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_DRAG_START, 'dragStart', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_DROP, 'drop', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_FOCUS, 'focus', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_INPUT, 'input', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_INVALID, 'invalid', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_KEY_DOWN, 'keyDown', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_KEY_PRESS, 'keyPress', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_KEY_UP, 'keyUp', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_MOUSE_DOWN, 'mouseDown', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_MOUSE_UP, 'mouseUp', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_PASTE, 'paste', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_PAUSE, 'pause', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_PLAY, 'play', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_POINTER_CANCEL, 'pointerCancel', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_POINTER_DOWN, 'pointerDown', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_POINTER_UP, 'pointerUp', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_RATE_CHANGE, 'rateChange', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_RESET, 'reset', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_SEEKED, 'seeked', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_SUBMIT, 'submit', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_TOUCH_CANCEL, 'touchCancel', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_TOUCH_END, 'touchEnd', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_TOUCH_START, 'touchStart', DiscreteEvent],
  [DOMTopLevelEventTypes.TOP_VOLUME_CHANGE, 'volumeChange', DiscreteEvent],

  // User-blocking events
  [DOMTopLevelEventTypes.TOP_DRAG, 'drag', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_DRAG_ENTER, 'dragEnter', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_DRAG_EXIT, 'dragExit', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_DRAG_LEAVE, 'dragLeave', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_DRAG_OVER, 'dragOver', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_MOUSE_MOVE, 'mouseMove', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_MOUSE_OUT, 'mouseOut', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_MOUSE_OVER, 'mouseOver', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_POINTER_MOVE, 'pointerMove', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_POINTER_OUT, 'pointerOut', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_POINTER_OVER, 'pointerOver', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_SCROLL, 'scroll', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_TOGGLE, 'toggle', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_TOUCH_MOVE, 'touchMove', UserBlockingEvent],
  [DOMTopLevelEventTypes.TOP_WHEEL, 'wheel', UserBlockingEvent],

  // Continuous events
  [DOMTopLevelEventTypes.TOP_ABORT, 'abort', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_ANIMATION_END, 'animationEnd', ContinuousEvent],
  [
    DOMTopLevelEventTypes.TOP_ANIMATION_ITERATION,
    'animationIteration',
    ContinuousEvent,
  ],
  [
    DOMTopLevelEventTypes.TOP_ANIMATION_START,
    'animationStart',
    ContinuousEvent,
  ],
  [DOMTopLevelEventTypes.TOP_CAN_PLAY, 'canPlay', ContinuousEvent],
  [
    DOMTopLevelEventTypes.TOP_CAN_PLAY_THROUGH,
    'canPlayThrough',
    ContinuousEvent,
  ],
  [
    DOMTopLevelEventTypes.TOP_DURATION_CHANGE,
    'durationChange',
    ContinuousEvent,
  ],
  [DOMTopLevelEventTypes.TOP_EMPTIED, 'emptied', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_ENCRYPTED, 'encrypted', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_ENDED, 'ended', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_ERROR, 'error', ContinuousEvent],
  [
    DOMTopLevelEventTypes.TOP_GOT_POINTER_CAPTURE,
    'gotPointerCapture',
    ContinuousEvent,
  ],
  [DOMTopLevelEventTypes.TOP_LOAD, 'load', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_LOADED_DATA, 'loadedData', ContinuousEvent],
  [
    DOMTopLevelEventTypes.TOP_LOADED_METADATA,
    'loadedMetadata',
    ContinuousEvent,
  ],
  [DOMTopLevelEventTypes.TOP_LOAD_START, 'loadStart', ContinuousEvent],
  [
    DOMTopLevelEventTypes.TOP_LOST_POINTER_CAPTURE,
    'lostPointerCapture',
    ContinuousEvent,
  ],
  [DOMTopLevelEventTypes.TOP_PLAYING, 'playing', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_PROGRESS, 'progress', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_SEEKING, 'seeking', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_STALLED, 'stalled', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_SUSPEND, 'suspend', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_TIME_UPDATE, 'timeUpdate', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_TRANSITION_END, 'transitionEnd', ContinuousEvent],
  [DOMTopLevelEventTypes.TOP_WAITING, 'waiting', ContinuousEvent],
];

const eventTypes = {};
const topLevelEventsToDispatchConfig = {};

for (let i = 0; i < eventTuples.length; i++) {
  const eventTuple = eventTuples[i];
  const [topEvent, event, eventPriority] = eventTuple;

  const capitalizedEvent = event[0].toUpperCase() + event.slice(1);
  const onEvent = `on${capitalizedEvent}`;

  const config = {
    phasedRegistrationNames: {
      bubbled: onEvent,
      captured: onEvent + 'Capture',
    },
    dependencies: [topEvent],
    eventPriority,
  };
  eventTypes[event] = config;
  topLevelEventsToDispatchConfig[topEvent] = config;
}

const SimpleEventPlugin = {
  eventTypes,
  getEventPriority(topLevelType) {
    const config = topLevelEventsToDispatchConfig[topLevelType];
    return config !== undefined ? config.eventPriority : ContinuousEvent;
  },

  extractEvents(topLevelType, tragetInst, nativeEvent, nativeEventTarget, eventSystemFlags) {
    const dispatchConfig = topLevelEventsToDispatchConfig[topLevelType];
    if (!dispatchConfig) {
      return null;
    }
    let EventContructor;
    switch (topLevelType) {
      /**
       * Firefox也为功能键创建一个keypress事件。这将删除不需要的按键事件。但是，Enter既可打印又不可打印。有人会期望Tab也会这样（但事实并非如此）。
       */
      case DOMTopLevelEventTypes.TOP_KEY_PRESS:
        if (getEventCharCode(nativeEvent) === 0) {
          return null;
        }
      case DOMTopLevelEventTypes.TOP_KEY_DOWN:
      case DOMTopLevelEventTypes.TOP_KEY_UP:
        EventContructor = SyntheticKeyboardEvent;
        break;
      case DOMTopLevelEventTypes.TOP_BLUR:
      case DOMTopLevelEventTypes.TOP_FOCUS:
        EventContructor = SyntheticFocusEvent;
        break;
      case DOMTopLevelEventTypes.TOP_CLICK:
        if (nativeEvent.button === 2) {
          return null;
        }
      case DOMTopLevelEventTypes.TOP_AUX_CLICK:
      case DOMTopLevelEventTypes.TOP_DOUBLE_CLICK:
      case DOMTopLevelEventTypes.TOP_MOUSE_DOWN:
      case DOMTopLevelEventTypes.TOP_MOUSE_MOVE:
      case DOMTopLevelEventTypes.TOP_MOUSE_UP:
      case DOMTopLevelEventTypes.TOP_MOUSE_OUT:
      case DOMTopLevelEventTypes.TOP_MOUSE_OVER:
      case DOMTopLevelEventTypes.TOP_CONTEXT_MENU:
        EventContructor = SyntheticMouseEvent;
        break;
      case DOMTopLevelEventTypes.TOP_DRAG:
      case DOMTopLevelEventTypes.TOP_DRAG_END:
      case DOMTopLevelEventTypes.TOP_DRAG_ENTER:
      case DOMTopLevelEventTypes.TOP_DRAG_EXIT:
      case DOMTopLevelEventTypes.TOP_DRAG_LEAVE:
      case DOMTopLevelEventTypes.TOP_DRAG_OVER:
      case DOMTopLevelEventTypes.TOP_DRAG_START:
      case DOMTopLevelEventTypes.TOP_DROP:
        EventContructor = SyntheticDragEvent;
        break;
      case DOMTopLevelEventTypes.TOP_TOUCH_CANCEL:
      case DOMTopLevelEventTypes.TOP_TOUCH_END:
      case DOMTopLevelEventTypes.TOP_TOUCH_MOVE:
      case DOMTopLevelEventTypes.TOP_TOUCH_START:
        EventContructor = SyntheticTouchEvent;
        break;
      case DOMTopLevelEventTypes.TOP_ANIMATION_END:
      case DOMTopLevelEventTypes.TOP_ANIMATION_ITERATION:
      case DOMTopLevelEventTypes.TOP_ANIMATION_START:
        EventContructor = SyntheticAnimationEvent;
        break;
      case DOMTopLevelEventTypes.TOP_TRANSITION_END:
        EventContructor = SyntheticTransitionEvent;
        break;
      case DOMTopLevelEventTypes.TOP_SCROLL:
        EventContructor = SyntheticUIEvent;
        break;
      case DOMTopLevelEventTypes.TOP_WHEEL:
        EventContructor = SyntheticWheelEvent;
        break;
      case DOMTopLevelEventTypes.TOP_COPY:
      case DOMTopLevelEventTypes.TOP_CUT:
      case DOMTopLevelEventTypes.TOP_PASTE:
        EventContructor = SyntheticClipboardEvent;
        break;
      case DOMTopLevelEventTypes.TOP_GOT_POINTER_CAPTURE:
      case DOMTopLevelEventTypes.TOP_LOST_POINTER_CAPTURE:
      case DOMTopLevelEventTypes.TOP_POINTER_CANCEL:
      case DOMTopLevelEventTypes.TOP_POINTER_DOWN:
      case DOMTopLevelEventTypes.TOP_POINTER_MOVE:
      case DOMTopLevelEventTypes.TOP_POINTER_OUT:
      case DOMTopLevelEventTypes.TOP_POINTER_OVER:
      case DOMTopLevelEventTypes.TOP_POINTER_UP:
        EventContructor = SyntheticPointerEvent;
        break;
      default:
        EventContructor = SyntheticEvent;
    }

    const event = EventContructor.getPooled(dispatchConfig, tragetInst, nativeEvent, nativeEventTarget);
    accumulateTwoPhaseDispatches(event);
    return event;
  },
};

export default SimpleEventPlugin;