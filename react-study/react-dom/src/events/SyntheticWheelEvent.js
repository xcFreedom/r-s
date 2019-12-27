import SyntheticMouseEvent from './SyntheticMouseEvent';

const SyntheticWheelEvent = SyntheticMouseEvent.extend({
  deltaX(event) {
    return 'deltaX' in event
      ? event.deltaX
      : (
        'wheelDeltaX' in event
          ? -event.wheelDeltaX
          : 0
      );
  },
  deltaY(event) {
    return 'deltaY' in event
      ? event.deltaY
      : (
        'wheelDeltaY' in event
          ? -event.wheelDeltaY
          : (
            'wheelDelta' in event
              ? -event.wheelDelta
              : 0
          )
      );
  },
  deltaZ: null,
  // Browsers without "deltaMode" is reporting in raw wheel delta where one
  // notch on the scroll is always +/- 120, roughly equivalent to pixels.
  // A good approximation of DOM_DELTA_LINE (1) is 5% of viewport size or
  // ~40 pixels, for DOM_DELTA_SCREEN (2) it is 87.5% of viewport size.
  deltaMode: null,
});

export default SyntheticWheelEvent;