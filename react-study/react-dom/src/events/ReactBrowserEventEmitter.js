import {
  TOP_SCROLL, TOP_FOCUS, TOP_BLUR, TOP_CANCEL, TOP_CLOSE, getRawEventName, TOP_INVALID, TOP_SUBMIT, TOP_RESET, mediaEventTypes,
} from "./DOMTopLevelEventTypes";
import {
  isEnabled,
  setEnabled,
  trapCapturedEvent,
  trapBubbledEvent,
} from "./ReactDOMEventListener";
import isEventSupported from './isEventSupported';
import { registrationNameDependencies } from "react-study/legacy-events/EventPluginRegistry";

/**
 *  - 顶层事件委托用于捕获大多数原生的浏览器事件。这可能只会发生在主线程中，由ReactDOMEventListener负责，事件是被注入的形式，所以支持扩展。这是在主线程中发生的唯一工作。
 * 
 *  - 通过对事件名规范化/重复数据删除，来解决浏览器的兼容性问题。这可以在work线程中完成。
 * 
 *  - 将原生事件（以及用于捕获它的相关顶层事件）转发到"EventPluginHub"，后者会询问插件是否要提取任何合成事件。
 * 
 *  - EventPluginHub使用dispatches对每个事件处理，这是一个关注该事件的listener和id序列
 * 
 *  - 然后EventPluginHub会分发事件。
 * 
 * 
 * React的事件系统预览：
 * 
 * +------------+    .
 * |    DOM     |    .
 * +------------+    .
 *       |           .
 *       v           .
 * +------------+    .
 * | ReactEvent |    .
 * |  Listener  |    .
 * +------------+    .                         +-----------+
 *       |           .               +--------+|SimpleEvent|
 *       |           .               |         |Plugin     |
 * +-----|------+    .               v         +-----------+
 * |     |      |    .    +--------------+                    +------------+
 * |     +-----------.--->|EventPluginHub|                    |    Event   |
 * |            |    .    |              |     +-----------+  | Propagators|
 * | ReactEvent |    .    |              |     |TapEvent   |  |------------|
 * |  Emitter   |    .    |              |<---+|Plugin     |  |other plugin|
 * |            |    .    |              |     +-----------+  |  utilities |
 * |     +-----------.--->|              |                    +------------+
 * |     |      |    .    +--------------+
 * +-----|------+    .                ^        +-----------+
 *       |           .                |        |Enter/Leave|
 *       +           .                +-------+|Plugin     |
 * +-------------+   .                         +-----------+
 * | application |   .
 * |-------------|   .
 * |             |   .
 * |             |   .
 * +-------------+   .
 *                   .
 *    React Core     .  General Purpose Event Plugin System
 */

const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;
const elementListeningSets = new PossiblyWeakMap();

/**
 * 从elementListening映射中，获取元素对应的listener集合
 * @param {Element} element 
 * @returns {Set}
 */
export function getListeningSetForElement(element) {
  let listeningSet = elementListeningSets.get(element);
  if (listeningSet === undefined) {
    listeningSet = new Set();
    elementListeningSets.set(element, listeningSet);
  }
  return listeningSet;
}

/**
 * 我们监听文档对象上的冒泡触摸事件
 * @see http://www.quirksmode.org/blog/archives/2010/09/click_event_del.html
 * @param {string} registrationName 
 * @param {Element | Document | Node} mountAt 
 */
export function listenTo(registrationName, mountAt) {
  const listeningSet = getListeningSetForElement(mountAt);
  const dependencies = registrationNameDependencies[registrationName];

  for (let i = 0; i < dependencies.length; i++) {
    const dependency = dependencies[i];
    listenToTopLevel(dependency, mountAt, listeningSet);
  }
}

export function listenToTopLevel(topLevelType, mountAt, listeningSet) {
  if (!listeningSet.has(topLevelType)) {
    switch (topLevelType) {
      case TOP_SCROLL:
        trapCapturedEvent(TOP_SCROLL, mountAt);
        break;
      case TOP_FOCUS:
      case TOP_BLUR:
        trapCapturedEvent(TOP_FOCUS, mountAt);
        trapCapturedEvent(TOP_BLUR, mountAt);
        // 稍后我们将在这个函数中为单个依赖项设置标志，但这将确保我们将两者都标记为已附加，而不仅仅是一个。
        listeningSet.add(TOP_BLUR);
        listeningSet.add(TOP_FOCUS);
        break;
      case TOP_CANCEL:
      case TOP_CLOSE:
        if (isEventSupported(getRawEventName(topLevelType))) {
          trapCapturedEvent(topLevelType, mountAt);
        }
        break;
      case TOP_INVALID:
      case TOP_SUBMIT:
      case TOP_RESET:
        // 这些事件不希望它们二次触发
        break;
      default:
        // 默认情况下，在顶层监听所有非媒体事件。媒体事件不会冒泡，因此添加监听器不会做任何事情
        const isMediaEvent = mediaEventTypes.indexOf(topLevelType) !== -1;
        if (!isMediaEvent) {
          trapBubbledEvent(topLevelType, mountAt);
        }
        break;
    }
    listeningSet.add(topLevelType);
  }
}

export {
  setEnabled,
  isEnabled,
  trapBubbledEvent,
  trapCapturedEvent
};