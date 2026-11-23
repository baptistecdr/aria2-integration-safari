import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap";
import { Container } from "react-bootstrap";
import { CurrentTabProvider } from "@/shared/ui/current-tab-provider";
import { ExtensionOptionsProvider } from "@/shared/ui/extension-options-provider";
import ServersTabs from "./components/servers-tabs";

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <Container
      // Size from the space Safari gives the popup, not from the device: a sheet (iPhone, folded iPhone Duo) fills its
      // width, and a popover (Mac, iPad, unfolded iPhone Duo), which shrinks to its content, keeps at least 576px.
      // The minimum is capped to the screen because a popover's own viewport cannot tell how much room there is.
      style={{
        width: "100%",
        minWidth: `${Math.min(576, window.screen.width)}px`,
      }}
      className="p-3"
      fluid
    >
      <ExtensionOptionsProvider>
        <CurrentTabProvider>
          <ServersTabs />
        </CurrentTabProvider>
      </ExtensionOptionsProvider>
    </Container>
  </React.StrictMode>,
);
