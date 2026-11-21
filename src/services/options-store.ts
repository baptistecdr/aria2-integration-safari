import { ExtensionOptions } from "@/domain/extension-options";
import { onStorageChanged, readSyncStorage, writeSyncStorage } from "@/platform/storage";

const OPTIONS_KEY = "options";

// Reads the options from storage. The defaults are used when nothing, or something invalid, is stored.
export async function loadOptions(): Promise<ExtensionOptions> {
  const storage = await readSyncStorage();
  if (typeof storage[OPTIONS_KEY] === "string") {
    try {
      return ExtensionOptions.deserialize(storage[OPTIONS_KEY]);
    } catch (error) {
      console.error(error);
    }
  }
  return ExtensionOptions.create();
}

export async function saveOptions(options: ExtensionOptions): Promise<void> {
  await writeSyncStorage({ [OPTIONS_KEY]: ExtensionOptions.serialize(options) });
}

export type OptionsListener = (options: ExtensionOptions) => void;
export type OptionsUpdater = (current: ExtensionOptions) => ExtensionOptions;

/**
 * Single source of truth for the extension options, in each extension context (background, popup, options page).
 *
 * - `ready()` resolves once the options are loaded from storage: anything reading the options right after the context
 *   starts (e.g. a background event dispatched when the extension is woken up) must wait for it.
 * - `update()` always applies the change to the latest stored options, so concurrent writers (options page, popup) do
 *   not overwrite each other with stale values.
 * - `subscribe()` notifies about every change, wherever it was made.
 */
export interface OptionsStore {
  ready(): Promise<ExtensionOptions>;
  get(): ExtensionOptions;
  update(updater: OptionsUpdater): Promise<ExtensionOptions>;
  subscribe(listener: OptionsListener): () => void;
  dispose(): void;
}

export function createOptionsStore(): OptionsStore {
  // Replaced, never mutated: get() returns the same object until the options change.
  let current = ExtensionOptions.create();
  const listeners = new Set<OptionsListener>();
  // Writes are chained so that each update reads what the previous one wrote.
  let updates: Promise<unknown> = Promise.resolve();

  const set = (next: ExtensionOptions) => {
    if (ExtensionOptions.serialize(next) === ExtensionOptions.serialize(current)) {
      return;
    }
    current = next;
    for (const listener of listeners) {
      listener(current);
    }
  };

  const reload = async () => {
    try {
      set(await loadOptions());
    } catch (error) {
      // Keep the current options: the next change will try again.
      console.error(error);
    }
  };

  // Registered synchronously, before anything is awaited, so that no change is missed.
  const removeStorageListener = onStorageChanged((changes, areaName) => {
    if (areaName === "sync" && changes[OPTIONS_KEY]) {
      updates = updates.then(reload);
    }
  });
  const loaded = reload();

  return {
    ready: () => loaded.then(() => current),
    get: () => current,
    update(updater) {
      const update = updates.then(async () => {
        await loaded;
        const next = updater(await loadOptions());
        await saveOptions(next);
        set(next);
        return next;
      });
      updates = update.catch(() => {});
      return update;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      removeStorageListener();
      listeners.clear();
    },
  };
}
