/**
 * Create a function which has 'unsafe' privileges (required by windows8 apps)
 */
export default function createMicrosoftUnsafeLocalFunction(func) {
  if (typeof MSApp !== 'undefined' && MSApp.execUnsafeLocalFunction) {
    return function(arg0, arg1, arg2, arg3) {
      MSApp.execUnsafeLocalFunction(function() {
        return func(arg0, arg1, arg2, arg3);
      })
    };
  } else {
    return func;
  }
}