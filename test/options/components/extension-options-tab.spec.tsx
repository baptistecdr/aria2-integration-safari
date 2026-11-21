import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import Theme from "@/domain/theme";
import ExtensionOptionsTab from "@/options/components/extension-options-tab";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";

vi.mock("@/platform/i18n", () => ({
  default: (key: string) => key,
}));

vi.mock("@/shared/ui/extension-options-provider", () => ({
  useExtensionOptions: vi.fn(),
}));

describe("ExtensionOptionsTab", () => {
  const server = Server.create({ uuid: "server1", name: "NAS" });
  let current: ExtensionOptions;
  const updateExtensionOptions = vi.fn();

  // Renders the tab with the given options, like the provider does.
  const showOptions = (options: ExtensionOptions) => {
    current = options;
    vi.mocked(useExtensionOptions).mockReturnValue({ extensionOptions: current, updateExtensionOptions });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    updateExtensionOptions.mockImplementation(async (updater) => updater(current));
    showOptions(ExtensionOptions.create({ servers: { server1: server }, excludedSites: ["example.com"], theme: Theme.Light }));
  });

  it("shows the theme", () => {
    render(<ExtensionOptionsTab />);

    expect(screen.getByLabelText("extensionOptionsThemeLight")).toBeChecked();
    expect(screen.getByLabelText("extensionOptionsThemeDark")).not.toBeChecked();
  });

  it("saves the edited theme and keeps the other options", async () => {
    const user = userEvent.setup();
    render(<ExtensionOptionsTab />);

    await user.click(screen.getByLabelText("extensionOptionsThemeDark"));
    await user.click(screen.getByRole("button", { name: "serverOptionsSave" }));

    const saved: ExtensionOptions = await updateExtensionOptions.mock.results[0].value;
    expect(saved).toMatchObject({ servers: { server1: server }, excludedSites: ["example.com"], theme: Theme.Dark });
    expect(await screen.findByText("serverOptionsSuccess")).toBeInTheDocument();
  });

  it("shows the new options when they change elsewhere, e.g. once loaded or from the popup", () => {
    const { rerender } = render(<ExtensionOptionsTab />);

    showOptions(ExtensionOptions.withOverrides(current, { theme: Theme.Dark }));
    rerender(<ExtensionOptionsTab />);

    expect(screen.getByLabelText("extensionOptionsThemeDark")).toBeChecked();
  });

  it("keeps the confirmation visible once the saved options are shown", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ExtensionOptionsTab />);
    await user.click(screen.getByLabelText("extensionOptionsThemeAuto"));
    await user.click(screen.getByRole("button", { name: "serverOptionsSave" }));
    await screen.findByText("serverOptionsSuccess");

    showOptions(await updateExtensionOptions.mock.results[0].value);
    rerender(<ExtensionOptionsTab />);

    expect(screen.getByText("serverOptionsSuccess")).toBeInTheDocument();
    expect(screen.getByLabelText("extensionOptionsThemeAuto")).toBeChecked();
  });

  it("shows an error when the options can't be saved", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateExtensionOptions.mockRejectedValueOnce(new Error("quota exceeded"));
    const user = userEvent.setup();
    render(<ExtensionOptionsTab />);

    await user.click(screen.getByRole("button", { name: "serverOptionsSave" }));

    await waitFor(() => expect(screen.getByText("serverOptionsError")).toBeInTheDocument());
  });
});
