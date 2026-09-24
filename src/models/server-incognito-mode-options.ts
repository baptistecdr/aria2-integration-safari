import * as z from "zod/mini";

export const ServerIncognitoModeOptionsSchema = z.object({
  overwriteRpcParameters: z._default(z.boolean(), false),
  rpcParameters: z._default(z.record(z.string(), z.string()), () => ({})),
});

export type ServerIncognitoModeOptions = z.infer<typeof ServerIncognitoModeOptionsSchema>;

export const ServerIncognitoModeOptions = {
  create(data: Partial<ServerIncognitoModeOptions> = {}): ServerIncognitoModeOptions {
    return ServerIncognitoModeOptionsSchema.parse(data);
  },
};
