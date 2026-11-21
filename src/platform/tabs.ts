export type Tab = browser.tabs.Tab;

export async function findCurrentTab(): Promise<Tab | undefined> {
  const tabs = await browser.tabs.query({
    currentWindow: true,
    active: true,
  });
  if (tabs.length === 0) {
    return undefined;
  }
  return tabs[0];
}
