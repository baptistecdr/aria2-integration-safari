import { ExtensionOptions } from "@/domain/extension-options";
import type Theme from "@/domain/theme";

// The extension options as edited in the options page.
export interface ExtensionOptionsFormValues {
  theme: Theme;
}

export function toExtensionOptionsFormValues(options: ExtensionOptions): ExtensionOptionsFormValues {
  return { theme: options.theme };
}

// Applies the form to the options. The servers are edited in their own tabs, and the other options are not in the form:
// they are kept as they are.
export function applyExtensionOptionsFormValues(options: ExtensionOptions, values: ExtensionOptionsFormValues): ExtensionOptions {
  return ExtensionOptions.withOverrides(options, { theme: values.theme });
}
