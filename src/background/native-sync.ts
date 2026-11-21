import { ExtensionOptions } from "@/domain/extension-options";
import { sendOptionsToNativeApp } from "@/platform/native-app";
import type { OptionsStore } from "@/services/options-store";

// Shares the servers with the native app (e.g. the iOS Share Extension) once the options are loaded, then whenever they change.
export function keepNativeAppInSync(store: OptionsStore) {
  // Messages are sent one after the other so that the native app always ends up with the latest options.
  let syncs = Promise.resolve();
  const sync = (options: ExtensionOptions) => {
    syncs = syncs.then(() => sendOptionsToNativeApp(ExtensionOptions.serialize(options))).catch((error) => console.error(error));
  };
  // ready() never rejects.
  void store.ready().then((options) => {
    sync(options);
    store.subscribe(sync);
  });
}
