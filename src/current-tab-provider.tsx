import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export async function findCurrentTab(): Promise<browser.tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({
    currentWindow: true,
    active: true,
  });
  if (tabs.length === 0) {
    return undefined;
  }
  return tabs[0];
}

const CurrentTabContext = createContext<browser.tabs.Tab | undefined>(undefined);

interface CurrentTabProviderProps {
  children: ReactNode;
}

function CurrentTabProvider({ children }: CurrentTabProviderProps) {
  const [currentTab, setCurrentTab] = useState<browser.tabs.Tab | undefined>(undefined);

  useEffect(() => {
    findCurrentTab().then(setCurrentTab);
  }, []);

  return <CurrentTabContext.Provider value={currentTab}>{children}</CurrentTabContext.Provider>;
}

function useCurrentTab(): browser.tabs.Tab | undefined {
  return useContext(CurrentTabContext);
}

export { CurrentTabProvider, useCurrentTab };
