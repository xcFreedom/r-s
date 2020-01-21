import dangerousStyleValue from "./dangerousStyleValue";

/**
 * 设置dom的style
 * @param {Element} node 
 * @param {Props} styles 
 */
export function setValueForStyles(node, styles) {
  // 获取node原style
  const style = node.style;
  for (let styleName in styles) {
    if (!styles.hasOwnProperty(styleName)) {
      continue;
    }
    // 遍历新的style属性
    const isCustomProperty = styleName.indexOf('--') = 0;
    const styleValue = dangerousStyleValue(styleName, styles[styleName], isCustomProperty);
    if (styleName === 'float') {
      styleName = 'cssFloat';
    }
    // 自定义样式，调用setProperty
    if (isCustomProperty) {
      style.setProperty(styleName, styleValue);
    } else {
      style[styleName] = styleValue;
    }
  }
}