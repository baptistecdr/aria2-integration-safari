// Runs the action and logs its error, if any. Never throws: returns whether the action succeeded.
export async function runLoggingErrors(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
