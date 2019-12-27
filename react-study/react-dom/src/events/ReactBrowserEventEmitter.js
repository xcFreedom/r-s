import {
  TOP_SCROLL,
} from "./DOMTopLevelEventTypes";

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

export function getListeningSetForElement(element) {
  let listeningSet = elementListeningSets.get(element);
  if (listeningSet === undefined) {
    listeningSet = new Set();
    elementListeningSets.set(element, listeningSet);
  }
  return listeningSet;
}

export function listenToTopLevel(topLevelType, mountAt, listeningSet) {
  if (!listeningSet.has(topLevelType)) {
    switch (topLevelType) {
      case TOP_SCROLL:
        trapCapturedEvent
    }
  }
}