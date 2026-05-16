import { useEffect, useId, useState } from "react";
import { Alert, Button, Col, Form } from "react-bootstrap";
import { useExtensionOptions } from "@/extension-options-provider";
import ExtensionOptions from "@/models/extension-options";
import Theme from "@/models/theme";
import AlertProps from "@/options/models/alert-props";

function serializeExcludedOption(excludedOptions: string): string[] {
  return excludedOptions
    .trim()
    .split(/\s*,+\s*/)
    .filter((s) => s !== "");
}

function deserializeExcludedOption(excludedOption: string[]): string {
  return excludedOption.join(", ");
}

function ExtensionOptionsTab() {
  const { extensionOptions, setExtensionOptions } = useExtensionOptions();
  const [excludedProtocols, setExcludedProtocols] = useState(deserializeExcludedOption(extensionOptions.excludedProtocols));
  const [excludedSites, setExcludedSites] = useState(deserializeExcludedOption(extensionOptions.excludedSites));
  const [excludedFileTypes, setExcludedFileTypes] = useState(deserializeExcludedOption(extensionOptions.excludedFileTypes));
  const [useCompleteFilePath, setUseCompleteFilePath] = useState(extensionOptions.useCompleteFilePath);
  const [theme, setTheme] = useState(extensionOptions.theme);
  const [alertProps, setAlertProps] = useState(new AlertProps());

  useEffect(() => {
    setExcludedProtocols(deserializeExcludedOption(extensionOptions.excludedProtocols));
    setExcludedSites(deserializeExcludedOption(extensionOptions.excludedSites));
    setExcludedFileTypes(deserializeExcludedOption(extensionOptions.excludedFileTypes));
    setUseCompleteFilePath(extensionOptions.useCompleteFilePath);
    setTheme(extensionOptions.theme);
  }, [
    extensionOptions.excludedFileTypes,
    extensionOptions.excludedProtocols,
    extensionOptions.excludedSites,
    extensionOptions.theme,
    extensionOptions.useCompleteFilePath,
  ]);

  const onClickSaveExtensionOptions = async () => {
    try {
      const newExtensionOptions = await new ExtensionOptions(
        extensionOptions.servers,
        serializeExcludedOption(excludedProtocols),
        serializeExcludedOption(excludedSites),
        serializeExcludedOption(excludedFileTypes),
        useCompleteFilePath,
        theme,
      ).toStorage();
      setExtensionOptions(newExtensionOptions);
      setAlertProps(AlertProps.success(browser.i18n.getMessage("serverOptionsSuccess")));
    } catch {
      setAlertProps(AlertProps.error(browser.i18n.getMessage("serverOptionsError")));
    }
  };

  return (
    <Form className="row p-3">
      {alertProps.show && (
        <Col xs={12} sm={12}>
          <Alert variant={alertProps.variant} className="mb-3" onClose={() => setAlertProps(new AlertProps())} dismissible>
            {alertProps.message}
          </Alert>
        </Col>
      )}

      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-theme">
          <Form.Label>{browser.i18n.getMessage("extensionOptionsTheme")}</Form.Label>
          <Form.Group controlId="form-group-theme">
            <Form.Check
              inline
              label={browser.i18n.getMessage("extensionOptionsThemeLight")}
              name="group-theme"
              type="radio"
              id={useId()}
              value={Theme.Light}
              checked={theme === Theme.Light}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
            <Form.Check
              inline
              label={browser.i18n.getMessage("extensionOptionsThemeDark")}
              name="group-theme"
              type="radio"
              id={useId()}
              value={Theme.Dark}
              checked={theme === Theme.Dark}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
            <Form.Check
              inline
              label={browser.i18n.getMessage("extensionOptionsThemeAuto")}
              name="group-theme"
              type="radio"
              id={useId()}
              value={Theme.Auto}
              checked={theme === Theme.Auto}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
          </Form.Group>
        </Form.Group>
      </Col>

      <Col xs={12} sm={12} className="mb-3">
        <Button variant="primary" onClick={onClickSaveExtensionOptions}>
          {browser.i18n.getMessage("serverOptionsSave")}
        </Button>
      </Col>
    </Form>
  );
}

export default ExtensionOptionsTab;
