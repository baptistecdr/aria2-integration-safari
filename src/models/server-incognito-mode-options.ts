export default class ServerIncognitoModeOptions {
  constructor(
    public readonly overwriteRpcParameters: boolean = false,
    public readonly rpcParameters: Record<string, string> = {},
  ) {}
}
