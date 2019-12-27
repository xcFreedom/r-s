import SyntheticEvent from '../../../legacy-events/SyntheticEvent';

const SyntheticTransitionEvent = SyntheticEvent.extend({
  propertyName: null,
  elapsedTime: null,
  pseudoElement: null,
});

export default SyntheticTransitionEvent;