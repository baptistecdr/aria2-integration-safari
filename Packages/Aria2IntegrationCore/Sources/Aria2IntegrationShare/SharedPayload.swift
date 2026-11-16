import Foundation
import UniformTypeIdentifiers

/// What the user shared to the extension.
public enum SharedPayload: Equatable {
    case uri(String)
    case torrent(Data, name: String)

    public static let torrentTypeIdentifier = "org.bittorrent.torrent"

    public var displayText: String {
        switch self {
        case let .uri(uri): uri
        case let .torrent(_, name): name
        }
    }

    public static func load(from items: [NSExtensionItem]) async -> SharedPayload? {
        for provider in items.flatMap({ $0.attachments ?? [] }) {
            if let payload = await load(from: provider) {
                return payload
            }
        }
        return nil
    }

    private static func load(from provider: NSItemProvider) async -> SharedPayload? {
        // A web link (http, https, ftp, magnet...) is always sent as a URI, whatever its file name.
        var sharedFileURL: URL?
        if let url = await loadURL(from: provider) {
            guard url.isFileURL else { return .uri(url.absoluteString) }
            sharedFileURL = url
        }

        let suggestedName = provider.suggestedName
        let isTorrent = provider.hasItemConformingToTypeIdentifier(torrentTypeIdentifier)
            || suggestedName?.lowercased().hasSuffix(".torrent") == true
        if isTorrent, let data = await loadData(from: provider) {
            return .torrent(data, name: suggestedName ?? sharedFileURL?.lastPathComponent ?? "file.torrent")
        }

        if let sharedFileURL {
            return readTorrentFile(at: sharedFileURL)
        }
        return nil
    }

    /// Depending on the sharing app, the URL comes back as an `NSURL` or as its data representation.
    private static func loadURL(from provider: NSItemProvider) async -> URL? {
        if provider.canLoadObject(ofClass: NSURL.self) {
            let url: URL? = await withCheckedContinuation { continuation in
                _ = provider.loadObject(ofClass: NSURL.self) { object, _ in
                    continuation.resume(returning: (object as? NSURL) as URL?)
                }
            }
            if let url { return url }
        }

        guard provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
              let item = try? await provider.loadItem(forTypeIdentifier: UTType.url.identifier)
        else { return nil }
        switch item {
        case let url as URL: return url
        case let data as Data: return URL(dataRepresentation: data, relativeTo: nil)
        case let string as String: return URL(string: string)
        default: return nil
        }
    }

    private static func loadData(from provider: NSItemProvider) async -> Data? {
        let typeIdentifier = provider.hasItemConformingToTypeIdentifier(torrentTypeIdentifier)
            ? torrentTypeIdentifier
            : UTType.data.identifier
        return await withCheckedContinuation { continuation in
            _ = provider.loadDataRepresentation(forTypeIdentifier: typeIdentifier) { data, _ in
                continuation.resume(returning: data)
            }
        }
    }

    private static func readTorrentFile(at url: URL) -> SharedPayload? {
        guard url.pathExtension.lowercased() == "torrent" else { return nil }
        let accessing = url.startAccessingSecurityScopedResource()
        defer { if accessing { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else { return nil }
        return .torrent(data, name: url.lastPathComponent)
    }
}
