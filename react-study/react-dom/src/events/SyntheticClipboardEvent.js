import SyntheticEvent from '../../../legacy-events/SyntheticEvent';

const SyntheticClipboardEvent = SyntheticEvent.extend({
  clipboardData(event) {
    return 'clipboardDate' in event
      ? event.clipboardData
      : window.clipboardData;
  },
});

export default SyntheticClipboardEvent;