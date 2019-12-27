import SyntheticMouseEvent from './SyntheticMouseEvent';

const SyntheticDragEvent = SyntheticMouseEvent.extend({
  dataTransfer: null,
});

export default SyntheticDragEvent;