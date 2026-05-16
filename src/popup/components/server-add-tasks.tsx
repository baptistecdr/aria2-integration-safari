import type Aria2 from "@baptistecdr/aria2";
import { type SubmitEvent, useState } from "react";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { captureTorrentFromFile, captureURL } from "@/aria2-extension";
import { useCurrentTab } from "@/current-tab-provider";
import type Server from "@/models/server";

interface Props {
  aria2: Aria2;
  server: Server;
}

const DEFAULT_FORM_FILES = { files: null } as HTMLInputElement;

function ServerAddTasks({ aria2, server }: Props) {
  const [formUrls, setFormUrls] = useState<string[]>([]);
  const [formFiles, setFormFiles] = useState(DEFAULT_FORM_FILES);
  const currentTab = useCurrentTab();

  const formAddUrlsOnSubmit = (formEvent: SubmitEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    for (const url of formUrls) {
      captureURL(aria2, server, url, "", "", !!currentTab?.incognito);
    }
    formEvent.currentTarget.reset();
    setFormUrls([]);
  };

  const formAddFilesOnSubmit = (formEvent: SubmitEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (formFiles.files !== null) {
      for (let i = 0; i < formFiles.files.length; i += 1) {
        captureTorrentFromFile(aria2, server, formFiles.files[i], !!currentTab?.incognito);
      }
      formEvent.currentTarget.reset();
      setFormFiles(DEFAULT_FORM_FILES);
    }
  };

  return (
    <Row className="mt-2 gx-0 ps-2 pe-2">
      <Col xs={12} sm={12} className="mb-3">
        <Form onSubmit={formAddUrlsOnSubmit}>
          <Form.Group controlId="form-add-urls">
            <Form.Label>{browser.i18n.getMessage("addTaskAddUrls")}</Form.Label>
            <InputGroup>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder={browser.i18n.getMessage("addTaskAddUrlsPlaceholder")}
                value={formUrls.join("\n")}
                onChange={(e) => setFormUrls(e.target.value.split("\n"))}
              />
              <Button type="submit" variant="primary" size="sm">
                {browser.i18n.getMessage("addTaskAdd")}
              </Button>
            </InputGroup>
          </Form.Group>
        </Form>
      </Col>
      <Col xs={12} sm={12} className="mb-3">
        <Form onSubmit={formAddFilesOnSubmit}>
          <Form.Group controlId="form-add-files">
            <Form.Label>{browser.i18n.getMessage("addTaskAddFiles")}</Form.Label>
            <InputGroup>
              <Form.Control
                type="file"
                size="sm"
                accept="application/x-bittorrent, .torrent, application/metalink4+xml, application/metalink+xml, .meta4, .metalink"
                onChange={(e) => setFormFiles(e.target as HTMLInputElement)}
                multiple
              />
              <Button type="submit" variant="primary" size="sm">
                {browser.i18n.getMessage("addTaskAdd")}
              </Button>
            </InputGroup>
          </Form.Group>
        </Form>
      </Col>
    </Row>
  );
}

export default ServerAddTasks;
