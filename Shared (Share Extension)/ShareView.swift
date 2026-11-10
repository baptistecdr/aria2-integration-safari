import Aria2IntegrationCore
import Aria2IntegrationShare
import SwiftUI

@MainActor
final class ShareModel: ObservableObject {
    enum State: Equatable {
        case loading
        case unsupported
        case noServers
        case ready
        case sending
        case sent
        case failed(String)
    }

    @Published private(set) var state: State = .loading
    @Published private(set) var payload: SharedPayload?
    @Published var selectedServerID: String?
    let servers: [Aria2Server]

    private let extensionItems: [NSExtensionItem]
    private let onFinish: () -> Void

    init(extensionItems: [NSExtensionItem], onFinish: @escaping () -> Void) {
        self.extensionItems = extensionItems
        self.onFinish = onFinish
        servers = OptionsStore.servers()
        selectedServerID = servers.first?.id
    }

    func load() async {
        guard !servers.isEmpty else {
            state = .noServers
            return
        }
        payload = await SharedPayload.load(from: extensionItems)
        state = payload == nil ? .unsupported : .ready
    }

    func send() async {
        guard let payload, let server = servers.first(where: { $0.id == selectedServerID }) else { return }
        state = .sending
        do {
            switch payload {
            case let .uri(uri): try await server.addUri(uri)
            case let .torrent(data, _): try await server.addTorrent(data)
            }
            state = .sent
            try? await Task.sleep(nanoseconds: 800_000_000)
            onFinish()
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func cancel() {
        onFinish()
    }
}

struct ShareView: View {
    @ObservedObject var model: ShareModel

    var body: some View {
        #if os(iOS)
        NavigationStack {
            content
                .navigationTitle("Aria2 Integration")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { cancelButton }
                    ToolbarItem(placement: .confirmationAction) { sendButton }
                }
        }
        .task { await model.load() }
        #else
        // A macOS share sheet has no toolbar: show the title and the buttons in the view itself.
        VStack(spacing: 0) {
            Text("Aria2 Integration")
                .font(.headline)
                .padding(.top, 12)
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            Divider()
            HStack {
                Spacer()
                cancelButton.keyboardShortcut(.cancelAction)
                sendButton.keyboardShortcut(.defaultAction)
            }
            .padding(12)
        }
        .frame(minWidth: 420, minHeight: 320)
        .task { await model.load() }
        #endif
    }

    private var cancelButton: some View {
        Button("Cancel") { model.cancel() }
    }

    private var sendButton: some View {
        Button("Send") { Task { await model.send() } }
            .disabled(!canSend)
    }

    private var canSend: Bool {
        switch model.state {
        case .ready, .failed: model.selectedServerID != nil
        default: false
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.state {
        case .loading:
            ProgressView()
        case .noServers:
            message("No server configured",
                    systemImage: "server.rack",
                    detail: "Add a server in the Aria2 Integration extension settings in Safari, then try again.")
        case .unsupported:
            message("Nothing to send",
                    systemImage: "link.badge.plus",
                    detail: "Share a link, a magnet link or a .torrent file.")
        case .sent:
            message("Sent", systemImage: "checkmark.circle.fill", detail: nil)
        case .ready, .sending, .failed:
            form
        }
    }

    private var form: some View {
        Form {
            Section("Download") {
                Text(model.payload?.displayText ?? "")
                    .lineLimit(4)
                    .textSelection(.enabled)
            }
            Section("Server") {
                Picker("Server", selection: $model.selectedServerID) {
                    ForEach(model.servers) { server in
                        Text(server.name).tag(Optional(server.id))
                    }
                }
                .pickerStyle(.inline)
                .labelsHidden()
            }
            if case let .failed(error) = model.state {
                Section {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                }
            }
        }
        .formStyle(.grouped)
        .disabled(model.state == .sending)
        .overlay {
            if model.state == .sending {
                ProgressView()
            }
        }
    }

    private func message(_ title: LocalizedStringKey, systemImage: String, detail: LocalizedStringKey?) -> some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 44))
                .foregroundStyle(.secondary)
            Text(title).font(.headline)
            if let detail {
                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
    }
}
