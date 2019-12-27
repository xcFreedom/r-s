import SyntheticUIEvent from './SyntheticUIEvent';

const SyntheticFocusEvent = SyntheticUIEvent.extend({
  relatedTarget: null,
});

export default SyntheticFocusEvent;