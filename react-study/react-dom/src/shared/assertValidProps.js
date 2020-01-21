import ReactSharedInternals from '../../../shared/ReactSharedInternals';
import voidElementTags from './voidElementTags';


const HTML = '__html';

function assertValidProps(tag, props) {
  if (!props) {
    return;
  }

  if (voidElementTags[tag]) {
    // props.children == null && props.dangerouslySetInnerHTML == null
  }
}

export default assertValidProps;