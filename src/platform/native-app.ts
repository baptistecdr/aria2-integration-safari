// Safari ignores the application identifier and routes the message to the containing app's extension handler.
const NATIVE_APPLICATION_ID = "eu.bcosp.aria2-integration";

export const NATIVE_MESSAGE_SYNC_OPTIONS = "syncOptions";

// Sends the serialized options to the native app, which shares them with its Share Extensions through the App Group.
export async function sendOptionsToNativeApp(serializedOptions: string): Promise<void> {
  await browser.runtime.sendNativeMessage(NATIVE_APPLICATION_ID, {
    type: NATIVE_MESSAGE_SYNC_OPTIONS,
    options: serializedOptions,
  });
}
