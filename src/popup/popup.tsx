import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap";
import { Container } from "react-bootstrap";
import { CurrentTabProvider } from "@/current-tab-provider";
import { ExtensionOptionsProvider } from "@/extension-options-provider";
import ServersTabs from "./components/servers-tabs";

const width = /iPhone|iPod/.test(navigator.userAgent) ? "100%" : "576px";

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <Container
      style={{
        width: `${width}`,
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
