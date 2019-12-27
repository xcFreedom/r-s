import SimpleEventPlugin from './SimpleEventPlugin';
import { DiscreteEvent } from '../../../shared/ReactTypes';
import { flushDiscreteUpdatesIfNeeded } from '../../../legacy-events/ReactGenericBatching';
import {
  hasQuquedDiscreteEvents,
  isReplayableDiscreteEvent,
} from './ReactDOMEventReplaying';
import getEventTarget from './getEventTarget';
import { getClosestInstanceFromNode } from '../client/ReactDOMComponentTree';

const { getEventPriority } = SimpleEventPlugin;

export let _enabled = true;


export function dispatchEvent(topLevelType, eventSystemFlags, nativeEvent) {
  if (!_enabled) {
    return;
  }
  if (hasQuquedDiscreteEvents() && isReplayableDiscreteEvent(topLevelType)) {
    /**
     * 如果我们已经有一个离散事件队列，而这是另一个离散事件，那么我们就不能不管它的目标是什么都分发它，因为它们需要按顺序分发。
     */
    queueDiscreteEvent(null, topLevelType, eventSystemFlags, nativeEvent);
    return;
  }
}


function dispatchDiscreteEvent(topLevelType, eventSystemFlags, nativeEvent) {
  flushDiscreteUpdatesIfNeeded(nativeEvent.timeStamp);
  flushDiscreteUpdatesIfNeeded()
}

export function trapCapturedEvent(topLevelType, element) {
  trapEventForPluginEventSystem(element, topLevelType, true);
}

function trapEventForPluginEventSystem(element, topLevelType, capture) {
  let listener;
  switch (getEventPriority(topLevelType)) {
    case DiscreteEvent:
      listener = dispatchDiscreteEvent
  }
}

export function attemptToDispatchEvent(topLevelType, eventSystemFlags, nativeEvent) {
  const nativeEventTarget = getEventTarget(nativeEvent);
  let targetInst = getClosestInstanceFromNode(nativeEventTarget);
}