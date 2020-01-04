import ReactCurrentDispatcher from './ReactCurrentDispatcher';
import ReactCurrentOwner from './ReactCurrentOwner';

// TODO:
const ReactSharedInternals = {
  ReactCurrentDispatcher,
  ReactCurrentOwner,
  assign: Object.assign,
};

const React = {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: ReactSharedInternals,
};

export default React;