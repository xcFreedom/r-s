import getEventCharCode from './getEventCharCode';

const normalizeKey = {
  Esc: 'Escape',
  Spacebar: ' ',
  Left: 'ArrowLeft',
  Up: 'ArrowUp',
  Right: 'ArrowRight',
  Down: 'ArrowDown',
  Del: 'Delete',
  Win: 'OS',
  Menu: 'ContextMenu',
  Apps: 'ContextMenu',
  Scroll: 'ScrollLock',
  MozPrintableKey: 'Unidentified',
};

const translateToKey = {
  '8': 'Backspace',
  '9': 'Tab',
  '12': 'Clear',
  '13': 'Enter',
  '16': 'Shift',
  '17': 'Control',
  '18': 'Alt',
  '19': 'Pause',
  '20': 'CapsLock',
  '27': 'Escape',
  '32': ' ',
  '33': 'PageUp',
  '34': 'PageDown',
  '35': 'End',
  '36': 'Home',
  '37': 'ArrowLeft',
  '38': 'ArrowUp',
  '39': 'ArrowRight',
  '40': 'ArrowDown',
  '45': 'Insert',
  '46': 'Delete',
  '112': 'F1',
  '113': 'F2',
  '114': 'F3',
  '115': 'F4',
  '116': 'F5',
  '117': 'F6',
  '118': 'F7',
  '119': 'F8',
  '120': 'F9',
  '121': 'F10',
  '122': 'F11',
  '123': 'F12',
  '144': 'NumLock',
  '145': 'ScrollLock',
  '224': 'Meta',
};

function getEventKey(nativeEvent) {
  if (nativeEvent.key) {
    /**
     *  - 因为兼容性问题，浏览器给予的值不一致
     * 
     *  - FireFox实现key，但对于所有可打印字符（转换为Unidentified），忽略它。
     */
    const key = normalizeKey[nativeEvent.key] || nativeEvent.key;
    if (key !== 'Unidentified') {
      return key;
    }
  }

  // 如果浏览器没有实现key，模拟
  if (nativeEvent.type === 'keypress') {
    const charCode = getEventCharCode(nativeEvent);

    // enter键在技术上是可打印和不可打印的，因此可以通过“keypress”捕获，不应使用其他不可打印的键。
    return charCode === 13 ? 'Enter' : String.fromCharCode(charCode);
  }

  if (nativeEvent.type === 'keydown' || nativeEvent.type === 'keyup') {
    // 虽然用户键盘布局决定了每个“keyCode”值的实际含义，但几乎所有功能键都有一个通用值。
    return translateToKey[nativeEvent.keyCode] || 'Unidentified';
  }

  return '';
}

export default getEventKey;