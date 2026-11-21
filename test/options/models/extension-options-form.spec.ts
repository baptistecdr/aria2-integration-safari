import { describe, expect, it } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import Theme from "@/domain/theme";
import { applyExtensionOptionsFormValues, toExtensionOptionsFormValues } from "@/options/models/extension-options-form";

describe("extension options form", () => {
  it("shows the theme", () => {
    expect(toExtensionOptionsFormValues(ExtensionOptions.create({ theme: Theme.Dark }))).toEqual({ theme: Theme.Dark });
  });

  it("gives back the same options when the form is not changed", () => {
    const options = ExtensionOptions.create({
      servers: { server1: Server.create({ uuid: "server1" }) },
      excludedProtocols: ["ftp"],
      excludedSites: ["example.com", "microsoft"],
      excludedFileTypes: ["zip"],
      useCompleteFilePath: true,
      theme: Theme.Dark,
    });

    expect(applyExtensionOptionsFormValues(options, toExtensionOptionsFormValues(options))).toEqual(options);
  });

  it("changes the theme and keeps everything else", () => {
    const options = ExtensionOptions.create({ servers: { server1: Server.create({ uuid: "server1" }) }, excludedSites: ["a.com"], theme: Theme.Light });

    const applied = applyExtensionOptionsFormValues(options, { theme: Theme.Auto });

    expect(applied).toEqual({ ...options, theme: Theme.Auto });
  });
});
