import Aria2IntegrationCore
import SafariServices

/// Receives `browser.runtime.sendNativeMessage` calls from the web extension (src/background/background.ts).
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private static let syncOptionsMessageType = "syncOptions"

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message = request?.userInfo?[SFExtensionMessageKey] as? [String: Any]

        var reply: [String: Any] = ["ok": false]
        if message?["type"] as? String == Self.syncOptionsMessageType,
           let serializedOptions = message?["options"] as? String {
            reply["ok"] = OptionsStore.save(serializedOptions: serializedOptions)
        }

        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: reply]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
