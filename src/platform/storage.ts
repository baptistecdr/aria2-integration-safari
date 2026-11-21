export type StorageChanges = Record<string, browser.storage.StorageChange>;

export async function readSyncStorage(): Promise<Record<string, unknown>> {
  return browser.storage.sync.get(null);
}

export async function writeSyncStorage(items: Record<string, unknown>): Promise<void> {
  await browser.storage.sync.set(items);
}

export function onStorageChanged(listener: (changes: StorageChanges, areaName: string) => void): () => void {
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
