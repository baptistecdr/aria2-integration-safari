import { type SubmitEvent, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Alert, Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { useExtensionOptions } from "@/extension-options-provider";
import Server from "@/models/server";
import ServerIncognitoModeOptions from "@/models/server-incognito-mode-options";
import AlertProps from "@/options/models/alert-props";

interface Props {
  server: Server;
  deleteServer: (server: Server) => Promise<void>;
}

const VALIDATION_TIMEOUT = 1500; // 1,5 s

function deserializeRpcParameters(rpcParameters: Record<string, string>): string {
  return Object.keys(rpcParameters)
    .reduce((previousValue, currentValue) => {
      return `${previousValue}${currentValue}: ${rpcParameters[currentValue]}\n`;
    }, "")
    .trim();
}

function serializeRpcParameters(rpcParameters: string): Record<string, string> {
  const newRpcParameters: Record<string, string> = {};
  for (const parameter of rpcParameters.trim().split("\n")) {
    const [option, ...values] = parameter.split(/\s*:+\s*/);
    // We need to join on ':' in case the parameter is, for example, proxy: http://localhost:8080
    // option = proxy, values = ["http", "localhost", "8080"]
    const value = values.join(":");
    if (value !== "") {
      newRpcParameters[option] = value;
    }
  }
  return newRpcParameters;
}

function ServerOptionsTab({ server, deleteServer }: Props) {
  const { extensionOptions, setExtensionOptions } = useExtensionOptions();

  const [serverName, setServerName] = useState(server.name);
  const [serverHost, setServerHost] = useState(server.host);
  const [serverPort, setServerPort] = useState(server.port);
  const [serverSecure, setServerSecure] = useState(server.secure);
  const [serverSecret, setServerSecret] = useState(server.secret);
  const [serverRpcParameters, setServerRpcParameters] = useState(deserializeRpcParameters(server.rpcParameters));
  const [serverIncognitoModeOverwriteRpcParameters, setServerIncognitoModeOverwriteRpcParameters] = useState(
    server.incognitoModeOptions?.overwriteRpcParameters ?? false,
  );
  const [serverIncognitoModeRpcParameters, setServerIncognitoModeRpcParameters] = useState(
    deserializeRpcParameters(server.incognitoModeOptions?.rpcParameters || {}),
  );

  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alertProps, setAlertProps] = useState(new AlertProps());

  function serverUrl(): URL | null {
    try {
      return new URL(`http${serverSecure ? "s" : ""}://${serverHost}:${serverPort}/jsonrpc`);
    } catch (_) {
      return null;
    }
  }

  async function onSubmitSaveServer(formEvent: SubmitEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = formEvent.currentTarget;
    if (form.checkValidity()) {
      try {
        const newExtensionOptions = await extensionOptions.addServer(
          new Server(
            server.uuid,
            serverName,
            serverSecure,
            serverHost,
            serverPort,
            "/jsonrpc",
            serverSecret,
            serializeRpcParameters(serverRpcParameters),
            new ServerIncognitoModeOptions(serverIncognitoModeOverwriteRpcParameters, serializeRpcParameters(serverIncognitoModeRpcParameters)),
          ),
        );
        setExtensionOptions(newExtensionOptions);
        setAlertProps(AlertProps.success(browser.i18n.getMessage("serverOptionsSuccess")));
      } catch {
        setAlertProps(AlertProps.error(browser.i18n.getMessage("serverOptionsError")));
      }
      window.setTimeout(() => setValidated(false), VALIDATION_TIMEOUT);
    }
    setValidated(true);
  }

  return (
    <Form className="p-3" noValidate validated={validated} onSubmit={(fe) => onSubmitSaveServer(fe)}>
      {alertProps.show && (
        <Row className="mb-3">
          <Form.Group as={Col} controlId="form-server-name">
            <Alert variant={alertProps.variant} className="mb-0" onClose={() => setAlertProps(new AlertProps())} dismissible>
              {alertProps.message}
            </Alert>
          </Form.Group>
        </Row>
      )}
      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-server-name">
          <Form.Label>{browser.i18n.getMessage("serverOptionsName")}</Form.Label>
          <Form.Control type="text" value={serverName} required onChange={(e) => setServerName(e.target.value)} />
        </Form.Group>
        <Form.Group as={Col} controlId="form-server-host">
          <Form.Label>{browser.i18n.getMessage("serverOptionsHost")}</Form.Label>
          <Form.Control type="text" value={serverHost} required onChange={(e) => setServerHost(e.target.value)} />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-server-port">
          <Form.Label>{browser.i18n.getMessage("serverOptionsPort")}</Form.Label>
          <Form.Control type="number" min={0} max={49151} value={serverPort} required onChange={(e) => setServerPort(Number.parseInt(e.target.value, 10))} />
        </Form.Group>

        <Form.Group as={Col} controlId="form-server-secure">
          <Form.Label>{browser.i18n.getMessage("serverOptionsSecureConnection")}</Form.Label>
          <Form.Check checked={serverSecure} onChange={(e) => setServerSecure(e.target.checked)} />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-server-url">
          <Form.Label>{browser.i18n.getMessage("serverOptionsUrl")}</Form.Label>
          <Form.Control type="text" value={serverUrl()?.toString() ?? ""} disabled={true} />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-server-secret">
          <Form.Label>{browser.i18n.getMessage("serverOptionsSecret")}</Form.Label>
          <InputGroup>
            <Form.Control type={showPassword ? "text" : "password"} value={serverSecret} onChange={(e) => setServerSecret(e.target.value)} />
            <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>
              <i className={showPassword ? "bi-eye-slash" : "bi-eye"} />
            </Button>
          </InputGroup>
          <Form.Text muted>{browser.i18n.getMessage("serverOptionsSecretDescription")}</Form.Text>
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-rpc-parameters">
          <Form.Label>{browser.i18n.getMessage("serverOptionsRpcParameters")}</Form.Label>
          <Form.Control as="textarea" rows={3} placeholder="split: 5" value={serverRpcParameters} onChange={(e) => setServerRpcParameters(e.target.value)} />
          <Form.Text>{browser.i18n.getMessage("serverOptionsRpcParametersDescription")}</Form.Text>
        </Form.Group>
      </Row>

      <div className="my-3">
        <div className="d-flex align-items-center">
          <hr className="flex-grow-1 m-0" />
          <span className="px-2 small text-nowrap">{browser.i18n.getMessage("serverOptionsIncognitoMode")}</span>
          <hr className="flex-grow-1 m-0" />
        </div>
      </div>

      <Row className="mb-3">
        <Form.Group controlId="form-im-overwrite-rpc-parameters">
          <Form.Check
            label={browser.i18n.getMessage("serverOptionsOverwriteRpcParameters")}
            aria-label={browser.i18n.getMessage("serverOptionsOverwriteRpcParameters")}
            checked={serverIncognitoModeOverwriteRpcParameters}
            onChange={(e) => setServerIncognitoModeOverwriteRpcParameters(e.target.checked)}
          />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-im-rpc-parameters">
          <Form.Label>{browser.i18n.getMessage("serverOptionsRpcParameters")}</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="split: 5"
            disabled={!serverIncognitoModeOverwriteRpcParameters}
            value={serverIncognitoModeRpcParameters}
            onChange={(e) => setServerIncognitoModeRpcParameters(e.target.value)}
          />
          <Form.Text>{browser.i18n.getMessage("serverOptionsRpcParametersDescription")}</Form.Text>
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Col xs={12} sm={12}>
          <Button type="submit" variant="primary">
            {browser.i18n.getMessage("serverOptionsSave")}
          </Button>
          <Button variant="danger" className="ms-2" onClick={() => deleteServer(server)}>
            {browser.i18n.getMessage("serverOptionsDelete")}
          </Button>
        </Col>
      </Row>
    </Form>
  );
}

export default ServerOptionsTab;
