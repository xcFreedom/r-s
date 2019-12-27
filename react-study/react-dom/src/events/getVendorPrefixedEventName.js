import { canUseDOM } from '../../../shared/ExecutionEnvironment';

function makePrefixMap(styleProp, eventName) {
  const prefixes = {};

  prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
  prefixes[`Webkit${styleProp}`] = `webkit${eventName}`;
  prefixes[`Moz${styleProp}`] = `moz${eventName}`;

  return prefixes;
}

const vendorPrefixes = {
  animationend: makePrefixMap('Animation', 'AnimationEnd'),
  animationiteration: makePrefixMap('Animation', 'AnimationIteration'),
  animationstart: makePrefixMap('Animation', 'AnimationStart'),
  transitionend: makePrefixMap('Transition', 'TransitionEnd'),
};

const prefixedEventNames = {};

let style = {};

if (canUseDOM) {
  style = document.createElement('div').style;

  if (!('AnimationEvent' in window)) {
    delete vendorPrefixes.animationend.animation;
    delete vendorPrefixes.animationiteration.animation;
    delete vendorPrefixes.animationstart.animation;
  }

  if (!('TransitionEvent' in window)) {
    delete vendorPrefixes.transitionend.transition;
  }
}

function getVendorPrefixedEventName(eventName) {
  if (prefixedEventNames[eventName]) {
    return prefixedEventNames[eventName];
  } else if (!vendorPrefixes[eventName]) {
    return eventName;
  }

  const prefixMap = vendorPrefixes[eventName];

  for (const styleProp in prefixMap) {
    if (prefixMap.hasOwnProperty(styleProp) && styleProp in style) {
      return (prefixedEventNames[eventName] = prefixMap[styleProp]);
    }
  }

  return eventName;
}

export default getVendorPrefixedEventName;