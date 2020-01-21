import React from '../../../react';
import { toString, getToStringValue } from './ToStringValue';

function flattenChildren(children) {
  let content = '';

  React.Children.forEach(children, function(child) {
    if (child == null) {
      return;
    }

    content += child;
  });

  return content;
}

/**
 * 其实就是不建议直接在option元素上设置selected，建议在select上设置defaultValue和value
 * @param {Element} element 
 * @param {Props} props 
 */
export function validateProps(element, props) {
  // dev
}

/**
 * 提交mount wrapper
 * @param {Element} element 
 * @param {Object} props 
 */
export function postMountWrapper(element, props) {
  if (props.value != null) {
    element.setAttribute('value', toString(getToStringValue(props.value)));
  }
}


export function getHostProps(element, props) {
  const hostProps = {children: undefined, ...props};
  const content = flattenChildren(props.children);

  if (content) {
    hostProps.children = content;
  }

  return hostProps;
}
