import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import Theme from "@/domain/theme";
import { createOptionsStore, loadOptions, type OptionsStore, saveOptions } from "@/services/options-store";

const createMockServer = (overrides?: Partial<Server>): Server =>
  Server.create({
    uuid: "test-uuid",
    name: "Test Server",
    ...overrides,
  });

// Fakes the sync storage area and its onChanged event so that the store can be tested end to end.
function fakeSyncStorage(initial?: ExtensionOptions) {
  let stored: Record<string, unknown> = initial ? { options: ExtensionOptions.serialize(initial) } : {};
  const listeners: ((changes: Record<string, unknown>, areaName: string) => void)[] = [];
  vi.mocked(browser.storage.sync.get).mockImplementation(async () => ({ ...stored }));
  vi.mocked(browser.storage.sync.set).mockImplementation(async (items: Record<string, unknown>) => {
    stored = { ...stored, ...items };
    for (const listener of listeners) listener({ options: { newValue: items.options } }, "sync");
  });
  vi.mocked(browser.storage.onChanged.addListener).mockImplementation((listener: any) => {
    listeners.push(listener);
  });
  return {
    stored: () => ExtensionOptions.deserialize(stored.options as string),
    // Simulates a write made by another extension page.
    writeFromElsewhere(options: ExtensionOptions) {
      stored = { options: ExtensionOptions.serialize(options) };
      for (const listener of listeners) listener({ options: { newValue: stored.options } }, "sync");
    },
  };
}

describe("options store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.mocked(browser.storage.sync.get).mockReset().mockResolvedValue({});
    vi.mocked(browser.storage.sync.set).mockReset().mockResolvedValue(undefined);
    vi.mocked(browser.storage.onChanged.addListener).mockReset();
  });

  describe("saveOptions", () => {
    it("should save options to browser storage with correct format", async () => {
      const options = ExtensionOptions.create();

      await saveOptions(options);

      expect(browser.storage.sync.set).toHaveBeenCalledWith({ options: ExtensionOptions.serialize(options) });
      expect(browser.storage.sync.set).toHaveBeenCalledTimes(1);
    });
  });

  describe("loadOptions", () => {
    it("should return options from storage", async () => {
      const server = createMockServer({ uuid: "server-id" });
      const storedOptions = ExtensionOptions.create({ servers: { "server-id": server }, useCompleteFilePath: true });
      const serialized = ExtensionOptions.serialize(storedOptions);

      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: serialized,
      });

      const options = await loadOptions();

      expect(options.servers).toEqual(storedOptions.servers);
      expect(options.useCompleteFilePath).toBe(true);
    });

    it("should return default options when storage is empty", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const options = await loadOptions();

      expect(options).toEqual(ExtensionOptions.create());
    });

    it("should return default options when options field is missing", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        otherField: "value",
      });

      const options = await loadOptions();

      expect(options).toEqual(ExtensionOptions.create());
    });

    it("should return default options and log the error when stored options are corrupted", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: "not valid json{",
      });

      const options = await loadOptions();

      expect(options).toEqual(ExtensionOptions.create());
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should correctly deserialize all properties from storage", async () => {
      const server = createMockServer({ uuid: "server-1" });
      const storedOptions = ExtensionOptions.create({
        servers: { "server-1": server },
        excludedProtocols: ["ftp"],
        excludedSites: ["blocked.com"],
        excludedFileTypes: ["zip"],
        useCompleteFilePath: true,
        theme: Theme.Dark,
      });
      const serialized = ExtensionOptions.serialize(storedOptions);

      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: serialized,
      });

      const options = await loadOptions();

      expect(options.excludedProtocols).toEqual(["ftp"]);
      expect(options.excludedSites).toEqual(["blocked.com"]);
      expect(options.excludedFileTypes).toEqual(["zip"]);
      expect(options.useCompleteFilePath).toBe(true);
      expect(options.theme).toBe(Theme.Dark);
    });
  });

  describe("createOptionsStore", () => {
    let store: OptionsStore;

    afterEach(() => {
      store.dispose();
    });

    it("should return the defaults until the options are loaded, then the stored options", async () => {
      const storedOptions = ExtensionOptions.create({ theme: Theme.Dark });
      fakeSyncStorage(storedOptions);

      store = createOptionsStore();

      expect(store.get()).toEqual(ExtensionOptions.create());
      expect(await store.ready()).toEqual(storedOptions);
      expect(store.get()).toEqual(storedOptions);
    });

    it("should wait for the options to be loaded before resolving ready", async () => {
      let resolveStorage: (value: Record<string, unknown>) => void = () => {};
      vi.mocked(browser.storage.sync.get).mockReturnValueOnce(new Promise((resolve) => (resolveStorage = resolve)));
      store = createOptionsStore();
      const onReady = vi.fn();

      const ready = store.ready().then(onReady);
      await Promise.resolve();
      expect(onReady).not.toHaveBeenCalled();

      resolveStorage({ options: ExtensionOptions.serialize(ExtensionOptions.create({ theme: Theme.Dark })) });
      await ready;
      expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ theme: Theme.Dark }));
    });

    it("should keep the defaults and log the error when storage cannot be read", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(browser.storage.sync.get).mockRejectedValueOnce(new Error("storage error"));

      store = createOptionsStore();

      expect(await store.ready()).toEqual(ExtensionOptions.create());
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should save updates and notify subscribers", async () => {
      const storage = fakeSyncStorage();
      store = createOptionsStore();
      const listener = vi.fn();
      store.subscribe(listener);

      const updated = await store.update((options) => ExtensionOptions.withOverrides(options, { useCompleteFilePath: true }));

      expect(updated.useCompleteFilePath).toBe(true);
      expect(storage.stored().useCompleteFilePath).toBe(true);
      expect(store.get().useCompleteFilePath).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(updated);
    });

    it("should apply updates to the latest stored options instead of a stale copy", async () => {
      const storage = fakeSyncStorage();
      store = createOptionsStore();
      await store.ready();
      // Another page changes the theme, and this store has not reloaded yet.
      storage.writeFromElsewhere(ExtensionOptions.create({ theme: Theme.Dark }));

      await store.update((options) => ExtensionOptions.withOverrides(options, { useCompleteFilePath: true }));

      expect(storage.stored()).toEqual(ExtensionOptions.create({ theme: Theme.Dark, useCompleteFilePath: true }));
    });

    it("should apply concurrent updates one after the other", async () => {
      const storage = fakeSyncStorage();
      store = createOptionsStore();

      await Promise.all([
        store.update((options) => ExtensionOptions.withOverrides(options, { theme: Theme.Dark })),
        store.update((options) => ExtensionOptions.withOverrides(options, { useCompleteFilePath: true })),
      ]);

      expect(storage.stored()).toEqual(ExtensionOptions.create({ theme: Theme.Dark, useCompleteFilePath: true }));
    });

    it("should notify subscribers when the options are changed elsewhere", async () => {
      const storage = fakeSyncStorage();
      store = createOptionsStore();
      await store.ready();
      const listener = vi.fn();
      store.subscribe(listener);

      storage.writeFromElsewhere(ExtensionOptions.create({ theme: Theme.Dark }));

      await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(expect.objectContaining({ theme: Theme.Dark })));
      expect(store.get().theme).toBe(Theme.Dark);
    });

    it("should not notify subscribers when the options did not change", async () => {
      const storage = fakeSyncStorage(ExtensionOptions.create({ theme: Theme.Dark }));
      store = createOptionsStore();
      await store.ready();
      const listener = vi.fn();
      store.subscribe(listener);

      storage.writeFromElsewhere(ExtensionOptions.create({ theme: Theme.Dark }));
      await store.update((options) => options);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should stop notifying a subscriber once unsubscribed", async () => {
      fakeSyncStorage();
      store = createOptionsStore();
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      await store.update((options) => ExtensionOptions.withOverrides(options, { useCompleteFilePath: true }));

      expect(listener).not.toHaveBeenCalled();
    });

    it("should stop listening to storage once disposed", async () => {
      fakeSyncStorage();
      store = createOptionsStore();

      store.dispose();

      expect(browser.storage.onChanged.removeListener).toHaveBeenCalledWith(vi.mocked(browser.storage.onChanged.addListener).mock.calls[0][0]);
    });
  });
});
