import { filesize } from "filesize";
import { useCallback, useMemo, useState } from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import type { Server } from "@/domain/server";
import i18n from "@/platform/i18n";
import ServerAddTasks from "@/popup/components/server-add-tasks";
import ServerTask from "@/popup/components/server-task";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap";
import "./server-tab.css";
import { LoadingSpinner } from "@/popup/components/loading-spinner";
import { useAria2Tasks } from "@/popup/hooks/use-aria2-tasks";
import { createAria2Client } from "@/services/aria2-client";
import { runLoggingErrors } from "@/services/run-logging-errors";

const FILESIZE_BASE = { base: 2 } as const;

interface Props {
  server: Server;
}

function ServerTab({ server }: Props) {
  // The server can be changed elsewhere while the popup is open: reconnect when a setting of the connection changes, but
  // not on a rename or new download parameters.
  const { secure, host, port, path, secret } = server;
  const aria2 = useMemo(() => createAria2Client({ secure, host, port, path, secret }), [secure, host, port, path, secret]);
  const { loading, failed, globalStat, tasks } = useAria2Tasks(aria2);
  const [showAddTask, setShowAddTask] = useState(false);

  const onClickPurge = () => runLoggingErrors(() => aria2.purgeDownloadResult());

  const toggleAddTask = useCallback(() => {
    setShowAddTask((prev) => !prev);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  const showTaskList = !showAddTask;

  return (
    <Container fluid>
      <Row>
        <Col xs={6} className="align-self-baseline text-start stats">
          <i className="bi-arrow-down" /> {filesize(globalStat.downloadSpeed, FILESIZE_BASE)}/s - <i className="bi-arrow-up" />{" "}
          {filesize(globalStat.uploadSpeed, FILESIZE_BASE)}/s
        </Col>
        <Col xs={6} className="align-self-baseline text-end">
          <Button variant="primary" size="sm" className="btn-left" onClick={toggleAddTask}>
            {showAddTask ? i18n("serverCancel") : i18n("serverAdd")}
          </Button>
          <Button variant="danger" size="sm" className="btn-right" onClick={onClickPurge}>
            {i18n("serverPurge")}
          </Button>
        </Col>
        <Col xs={12}>
          <hr className="mt-2 mb-2" />
        </Col>
      </Row>
      {showAddTask && <ServerAddTasks aria2={aria2} server={server} />}
      {showTaskList && tasks.length === 0 && (
        <Row>
          <Col xs={12}>
            <em>{failed ? i18n("serverError") : i18n("serverNoTasks")}</em>
          </Col>
        </Row>
      )}
      {showTaskList && tasks.map((task) => <ServerTask key={task.gid} server={server} aria2={aria2} task={task} />)}
    </Container>
  );
}

export default ServerTab;
