import { useEffect, useState } from "react";
import { Alert, Button, Col, Form } from "react-bootstrap";
import ExtensionOptions from "@/models/extension-options";
import AlertProps from "@/options/models/alert-props";
import i18n from "@/i18n";
import Theme from "@/models/theme";

interface Props {
  extensionOptions: ExtensionOptions;
  setExtensionOptions: React.Dispatch<React.SetStateAction<ExtensionOptions>>;
}

function ExtensionOptionsTab({ extensionOptions, setExtensionOptions }: Props) {
  function deserializeExcludedOption(excludedOption: string[]) {
    return excludedOption.join(", ");
  }

  const [captureDownloads, setCaptureDownloads] = useState(extensionOptions.captureDownloads);
  const [captureServer, setCaptureServer] = useState(extensionOptions.captureServer);
  const [excludedProtocols, setExcludedProtocols] = useState(deserializeExcludedOption(extensionOptions.excludedProtocols));
  const [excludedSites, setExcludedSites] = useState(deserializeExcludedOption(extensionOptions.excludedSites));
  const [excludedFileTypes, setExcludedFileTypes] = useState(deserializeExcludedOption(extensionOptions.excludedFileTypes));
  const [useCompleteFilePath, setUseCompleteFilePath] = useState(extensionOptions.useCompleteFilePath);
  const [theme, setTheme] = useState(extensionOptions.theme);
  const [alertProps, setAlertProps] = useState(new AlertProps());

  function serializeExcludedOption(excludedOptions: string) {
    return excludedOptions
      .trim()
      .split(/\s*,+\s*/)
      .filter((s) => s !== "");
  }

  useEffect(() => {
    setCaptureDownloads(extensionOptions.captureDownloads);
    setCaptureServer(extensionOptions.captureServer);
    setExcludedProtocols(deserializeExcludedOption(extensionOptions.excludedProtocols));
    setExcludedSites(deserializeExcludedOption(extensionOptions.excludedSites));
    setExcludedFileTypes(deserializeExcludedOption(extensionOptions.excludedFileTypes));
    setUseCompleteFilePath(extensionOptions.useCompleteFilePath);
    setTheme(extensionOptions.theme);
  }, [
    extensionOptions.captureDownloads,
    extensionOptions.captureServer,
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
        captureServer,
        captureDownloads,
        serializeExcludedOption(excludedProtocols),
        serializeExcludedOption(excludedSites),
        serializeExcludedOption(excludedFileTypes),
        useCompleteFilePath,
        theme,
      ).toStorage();
      setExtensionOptions(newExtensionOptions);
      setAlertProps(AlertProps.success(i18n("serverOptionsSuccess")));
    } catch {
      setAlertProps(AlertProps.error(i18n("serverOptionsError")));
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
          <Form.Label>{i18n("extensionOptionsTheme")}</Form.Label>
          <Form.Group controlId="form-group-theme">
            <Form.Check
              inline
              label={i18n("extensionOptionsThemeLight")}
              name="group-theme"
              type="radio"
              id="theme-light"
              value={Theme.Light}
              checked={theme === Theme.Light}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
            <Form.Check
              inline
              label={i18n("extensionOptionsThemeDark")}
              name="group-theme"
              type="radio"
              id="theme-dark"
              value={Theme.Dark}
              checked={theme === Theme.Dark}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
            <Form.Check
              inline
              label={i18n("extensionOptionsThemeAuto")}
              name="group-theme"
              type="radio"
              id="theme-auto"
              value={Theme.Auto}
              checked={theme === Theme.Auto}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
          </Form.Group>
        </Form.Group>
      </Col>

      <Col xs={12} sm={12} className="mb-3">
        <Button variant="primary" onClick={onClickSaveExtensionOptions} disabled={captureDownloads && captureServer === ""}>
          {i18n("serverOptionsSave")}
        </Button>
      </Col>
    </Form>
  );
}

export default ExtensionOptionsTab;
