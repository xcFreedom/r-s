function getEventCharCode(nativeEvent) {
  let charCode;
  const keyCode = nativeEvent.keyCode;
  if ('charCode' in nativeEvent) {
    charCode = nativeEvent.charCode;

    // firefox没有为回车键设置charCode，需要检查keyCode
    if (charCode === 0 && keyCode === 13) {
      charCode = 13;
    }
  } else {
    // IE8没有实现charCode，但是keyCode是正确的
    charCode = keyCode;
  }

  /**
   * IE、Edge、Chrome、Safari会在同时按下enter和ctrl时把charCode设置为10
   * 经测试，现在chrome不会发生这种行为，event内有属性ctrlKey表示ctrl是否按下
   */
  if (charCode === 10) {
    charCode = 13;
  }

  if (charCode >= 32 || charCode === 13) {
    return charCode;
  }

  return 0;
}

export default getEventCharCode;