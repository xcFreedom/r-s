export function logCapturedError(capturedError) {
  const logError = showErrorDialog(capturedError);

  if (logError === false) {
    return;
  }

  const error = capturedError.error;
  if (__DEV__) {
    //
  } else {
    console.error(error);
  }
}