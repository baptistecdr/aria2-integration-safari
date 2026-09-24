function i18n(messageName: string, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(messageName, substitutions);
}

export default i18n;
