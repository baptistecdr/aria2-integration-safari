import { createRoot } from "react-dom/client";
import React, { useEffect, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap";
import { Container, Tab, Tabs } from "react-bootstrap";
import i18n from "@/i18n";
import ServerTab from "./components/server-tab";
import ExtensionOptions from "@/models/extension-options";
import { applyTheme } from "@/models/theme";

const container = document.getElementById("root");
const root = createRoot(container!);

const width = /iPhone|iPod/.test(navigator.userAgent) ? "100%" : "576px";

function Servers() {
  const [extensionOptions, setExtensionOptions] = useState(new ExtensionOptions());
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    ExtensionOptions.fromStorage().then((result) => {
      setExtensionOptions(result);
      setActiveTab(Object.keys(result.servers)[0] ?? "");
    });
  }, []);

  applyTheme(extensionOptions.theme);

  if (Object.keys(extensionOptions.servers).length === 0) {
    return (
      <div className="text-center">
        {i18n("popupNoServerFound1")} <br />
        {i18n("popupNoServerFound2")}
      </div>
    );
  }

  return (
    <Tabs id="tabs-servers" defaultActiveKey="" activeKey={activeTab} onSelect={(k) => setActiveTab(k ?? "")} className="mb-3">
      {Object.entries(extensionOptions.servers).map(([id, server]) => (
        <Tab key={`tab-${id}`} eventKey={id} title={server.name}>
          <ServerTab key={`server-${id}`} server={server} />
        </Tab>
      ))}
    </Tabs>
  );
}

root.render(
  <React.StrictMode>
    <Container
      style={{
        width: `${width}`,
      }}
      className="p-3"
      fluid
    >
      <Servers />
    </Container>
  </React.StrictMode>,
);
