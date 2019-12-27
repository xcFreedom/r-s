import SyntheticUIEvent from './SyntheticUIEvent';
import getEventKey from './getEventKey';
import getEventModifierState from './getEventModifierState';
import getEventCharCode from './getEventCharCode';

/**
 * 键盘事件主要有：keydown、keypress、keyup三个事件，它们都继承了KeyboardEvent接口。
 * keydown： 按下键盘时触发。
 * keypress：按下有值的键时触发，即按下Ctrl、Alt、Shift、Meta这样无值的键不会触发。对于有值的键，先触发keydown再触发此事件。
 * keyup：松开键盘时触发。
 * 
 * 如果用户一直不松开，就会连续触发键盘事件，顺序如下：
 * keydown
 * keypress
 * keydown
 * keypress
 * ...
 * keyup
 * 
 * 
 * KeyboardEvent
 * 
 * key：字符串，当前按下的键，默认为空字符串。

  code：字符串，表示当前按下的键的字符串形式，默认为空字符串。

  location：整数，当前按下的键的位置，默认为0。

  ctrlKey：布尔值，是否按下 Ctrl 键，默认为false。

  shiftKey：布尔值，是否按下 Shift 键，默认为false。

  altKey：布尔值，是否按下 Alt 键，默认为false。

  metaKey：布尔值，是否按下 Meta 键，默认为false。

  repeat：布尔值，是否重复按键，默认为false。
*/

/**
* KeyboardEvent.code
  KeyboardEvent.code属性返回一个字符串，表示当前按下的键的字符串形式。该属性只读。

  下面是一些常用键的字符串形式，其他键请查文档。

  数字键0 - 9：返回digital0 - digital9

  字母键A - z：返回KeyA - KeyZ

  功能键F1 - F12：返回 F1 - F12

  方向键：返回ArrowDown、ArrowUp、ArrowLeft、ArrowRight

  Alt 键：返回AltLeft或AltRight

  Shift 键：返回ShiftLeft或ShiftRight

  Ctrl 键：返回ControlLeft或ControlRight
*/

/**
 * KeyboardEvent.getModifierState()
  KeyboardEvent.getModifierState()方法返回一个布尔值，表示是否按下或激活指定的功能键。它的常用参数如下。

  Alt：Alt 键

  CapsLock：大写锁定键

  Control：Ctrl 键

  Meta：Meta 键

  NumLock：数字键盘开关键

  Shift：Shift 键
*/

/**
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
const SyntheticKeyboardEvent = SyntheticUIEvent.extend({
  key: getEventKey,
  location: null,
  ctrlKey: null,
  shiftKey: null,
  altKey: null,
  metaKey: null,
  repeat: null,
  locale: null,
  getModifierState: getEventModifierState,
  charCode(event) {
    /**
     * - `charCode`是按键事件的结果，表示实际可打印字符的值。
     * - KeyPress已经被弃用，但它的替代还不是最终的，也没有在任何主流浏览器中实现。只有按键才有字符码。
     */
    if (event.type === 'keypress') {
      return getEventCharCode(event);
    }
  },
  keyCode(event) {
    /**
     * - `keyCode`是KeyDown/Up事件的结果，表示物理键盘键的值。
     * - 该值的实际含义取决于无法检测到的用户键盘布局。假设它是一个美国键盘布局为美国和欧洲用户提供了令人惊讶的精确映射。因此，现在由用户来实现。
     */
    if (event.type === 'keydown' || event.type === 'keyup') {
      return event.keyCode;
    }
    return 0;
  },
  which(event) {
    if (event.type === 'keypress') {
      return getEventCharCode(event);
    }
    if (event.type === 'keydown' || event.type === 'keyup') {
      return event.keyCode;
    }
    return 0;
  }
});

export default SyntheticKeyboardEvent;