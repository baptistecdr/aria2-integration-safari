import * as z from "zod/mini";
import { type Server, ServerSchema } from "@/domain/server";
import Theme from "@/domain/theme";

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

  // Throws when the serialized options are not valid JSON or do not match the schema.
  deserialize(serialized: string): ExtensionOptions {
    return ExtensionOptions.create(JSON.parse(serialized));
  },

  withOverrides(options: ExtensionOptions, overrides: Partial<ExtensionOptions>): ExtensionOptions {
    return ExtensionOptions.create({ ...options, ...overrides });
  },

  // Adds the server, or replaces the one with the same uuid.
  withServer(options: ExtensionOptions, server: Server): ExtensionOptions {
    return ExtensionOptions.withOverrides(options, {
      servers: { ...options.servers, [server.uuid]: server },
    });
  },

  withoutServer(options: ExtensionOptions, server: Server): ExtensionOptions {
    const remainingServers = { ...options.servers };
    delete remainingServers[server.uuid];
    return ExtensionOptions.withOverrides(options, { servers: remainingServers });
  },
};
