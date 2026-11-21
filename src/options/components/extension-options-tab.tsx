import { useId, useState } from "react";
import { Alert, Button, Col, Form } from "react-bootstrap";
import { ExtensionOptions } from "@/domain/extension-options";
import Theme from "@/domain/theme";
import { AlertProps } from "@/options/models/alert-props";
import { applyExtensionOptionsFormValues, type ExtensionOptionsFormValues, toExtensionOptionsFormValues } from "@/options/models/extension-options-form";
import i18n from "@/platform/i18n";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";
import { useFormValues } from "@/shared/ui/use-form-values";

function ExtensionOptionsTab() {
  const { extensionOptions, updateExtensionOptions } = useExtensionOptions();
  // Lives outside the form so that the confirmation stays visible when the saved options restart the form.
  const [alertProps, setAlertProps] = useState(AlertProps.none());

  const save = async (values: ExtensionOptionsFormValues) => {
    try {
      await updateExtensionOptions((options) => applyExtensionOptionsFormValues(options, values));
      setAlertProps(AlertProps.success(i18n("serverOptionsSuccess")));
    } catch (error) {
      console.error(error);
      setAlertProps(AlertProps.error(i18n("serverOptionsError")));
    }
  };

  // The form restarts from the options whenever they change: once loaded, when saved, or when changed elsewhere.
  return (
    <ExtensionOptionsForm
      key={ExtensionOptions.serialize(extensionOptions)}
      options={extensionOptions}
      alertProps={alertProps}
      onCloseAlert={() => setAlertProps(AlertProps.none())}
      onSave={save}
    />
  );
}

interface ExtensionOptionsFormProps {
  options: ExtensionOptions;
  alertProps: AlertProps;
  onCloseAlert: () => void;
  onSave: (values: ExtensionOptionsFormValues) => Promise<void>;
}

function ExtensionOptionsForm({ options, alertProps, onCloseAlert, onSave }: ExtensionOptionsFormProps) {
  const [values, set] = useFormValues(() => toExtensionOptionsFormValues(options));
  const themeIds = { light: useId(), dark: useId(), auto: useId() };

  const themes = [
    { theme: Theme.Light, label: i18n("extensionOptionsThemeLight"), id: themeIds.light },
    { theme: Theme.Dark, label: i18n("extensionOptionsThemeDark"), id: themeIds.dark },
    { theme: Theme.Auto, label: i18n("extensionOptionsThemeAuto"), id: themeIds.auto },
  ];

  return (
    <Form className="row p-3">
      {alertProps.show && (
        <Col xs={12} sm={12}>
          <Alert variant={alertProps.variant} className="mb-3" onClose={onCloseAlert} dismissible>
            {alertProps.message}
          </Alert>
        </Col>
      )}

      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-theme">
          <Form.Label>{i18n("extensionOptionsTheme")}</Form.Label>
          <Form.Group controlId="form-group-theme">
            {themes.map(({ theme, label, id }) => (
              <Form.Check
                key={theme}
                inline
                label={label}
                name="group-theme"
                type="radio"
                id={id}
                value={theme}
                checked={values.theme === theme}
                onChange={(e) => set("theme", e.target.value as Theme)}
              />
            ))}
          </Form.Group>
        </Form.Group>
      </Col>

      <Col xs={12} sm={12} className="mb-3">
        <Button variant="primary" onClick={() => onSave(values)}>
          {i18n("serverOptionsSave")}
        </Button>
      </Col>
    </Form>
  );
}

export default ExtensionOptionsTab;
