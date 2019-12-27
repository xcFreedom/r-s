const modifierKeyToProp = {
  Alt: 'altKey',
  Control: 'ctrlkey',
  Meta: 'metakey',
  Shift: 'shiftKey',
};

function modifierStateGetter(keyArg) {
  const syntheticEvent = this;
  const nativeEvent = syntheticEvent.nativeEvent;
  if (nativeEvent.getModifierState) {
    return nativeEvent.getModifierState(keyArg);
  }
  const keyProp = modifierKeyToProp[keyArg];
  return keyProp ? !!nativeEvent[keyProp] : false;
}

function getEventModifierState(nativeEvent) {
  return modifierStateGetter;
}

export default getEventModifierState;