import SyntheticEvent from '../../../legacy-events/SyntheticEvent';

const SyntheticUIEvent = SyntheticEvent.extend({
  view: null,
  detail: null,
});

export default SyntheticUIEvent;