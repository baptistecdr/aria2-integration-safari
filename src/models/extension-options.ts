import * as z from "zod/mini";
import { type Server, ServerSchema } from "@/models/server";
import Theme from "@/models/theme";

const ExtensionOptionsSchema = z.object({
  servers: z._default(z.record(z.string(), ServerSchema), () => ({})),
  excludedProtocols: z._default(z.array(z.string()), () => []),
  excludedSites: z._default(z.array(z.string()), () => []),
  excludedFileTypes: z._default(z.array(z.string()), () => []),
  useCompleteFilePath: z._default(z.boolean(), false),
  theme: z._default(z.enum(Theme), Theme.Auto),
});

export type ExtensionOptions = z.infer<typeof ExtensionOptionsSchema>;

export const ExtensionOptions = {
  create(data: Partial<ExtensionOptions> = {}): ExtensionOptions {
    return ExtensionOptionsSchema.parse(data);
  },

  serialize(options: ExtensionOptions): string {
    return JSON.stringify(options);
  },

  async toStorage(options: ExtensionOptions): Promise<ExtensionOptions> {
    await browser.storage.sync.set({
      options: ExtensionOptions.serialize(options),
    });
    return options;
  },

  withOverrides(options: ExtensionOptions, overrides: Partial<ExtensionOptions>): ExtensionOptions {
    return ExtensionOptions.create({ ...options, ...overrides });
  },

  addServer(options: ExtensionOptions, server: Server): Promise<ExtensionOptions> {
    return ExtensionOptions.toStorage(
      ExtensionOptions.withOverrides(options, {
        servers: { ...options.servers, [server.uuid]: server },
      }),
    );
  },

  deleteServer(options: ExtensionOptions, server: Server): Promise<ExtensionOptions> {
    const remainingServers = { ...options.servers };
    delete remainingServers[server.uuid];
    return ExtensionOptions.toStorage(ExtensionOptions.withOverrides(options, { servers: remainingServers }));
  },

  async fromStorage(): Promise<ExtensionOptions> {
    const storage = await browser.storage.sync.get(null);
    if (storage.options) {
      try {
        return ExtensionOptions.create(JSON.parse(storage.options as string));
      } catch (error) {
        console.error(error);
      }
    }
    return ExtensionOptions.create();
  },
};
