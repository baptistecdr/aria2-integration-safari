import AppKit
import SwiftUI

final class ShareViewController: NSViewController {
    override var nibName: NSNib.Name? { nil }

    override func loadView() {
        let items = extensionContext?.inputItems as? [NSExtensionItem] ?? []
        let model = ShareModel(extensionItems: items) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }

        let host = NSHostingController(rootView: ShareView(model: model))
        addChild(host)
        view = host.view
        preferredContentSize = NSSize(width: 420, height: 320)
    }
}
