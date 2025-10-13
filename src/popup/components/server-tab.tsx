import { useCallback, useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap";
import "./server-tab.css";
// @ts-expect-error No type information for aria2
import Aria2 from "@baptistecdr/aria2";
import { plainToInstance } from "class-transformer";
import { type FilesizeOptions, filesize } from "filesize";
import { Button, Col, Container, Row } from "react-bootstrap";
import browser from "webextension-polyfill";
import type Server from "@/models/server";
import ServerAddTasks from "@/popup/components/server-add-tasks";
import ServerTask from "@/popup/components/server-task";
import GlobalStat from "@/popup/models/global-stat";
import { Task } from "@/popup/models/task";

interface Props {
  server: Server;
}

type ActiveTasks = Task[];
type WaitingTasks = Task[];
type StoppedTasks = Task[];

async function getGlobalStat(aria2server: any): Promise<GlobalStat> {
  const globalStat: unknown = await aria2server.call("getGlobalStat", [], {});
  return plainToInstance(GlobalStat, globalStat);
}

async function getTasks(aria2server: any, numWaiting: number, numStopped: number): Promise<Task[]> {
  const result: [ActiveTasks[], WaitingTasks[], StoppedTasks[]] = await aria2server.multicall([
    ["tellActive"],
    ["tellWaiting", 0, numWaiting],
    ["tellStopped", 0, numStopped],
  ]);
  return plainToInstance(Task, result.flat(2));
}

function ServerTab({ server }: Props) {
  const [loading, setLoading] = useState(true);
  const [aria2] = useState(new Aria2(server));
  const [globalStat, setGlobalStat] = useState(GlobalStat.default());
  const [tasks, setTasks] = useState([] as Task[]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [defaultMessage, setDefaultMessage] = useState(browser.i18n.getMessage("serverNoTasks"));
  const fileSizeBase = { base: 2 } as FilesizeOptions;

  function onClickPurge() {
    aria2.call("aria2.purgeDownloadResult");
  }

  const updateTasks = useCallback(async () => {
    try {
      const gs = await getGlobalStat(aria2);
      const ts = await getTasks(aria2, gs.numWaiting, gs.numStopped);
      setGlobalStat(gs);
      setTasks(ts);
    } catch (_e: any) {
      setDefaultMessage(browser.i18n.getMessage("serverError"));
    }
    setLoading(false);
  }, [aria2]);

  useEffect(() => {
    updateTasks();
    const intervalId = window.setInterval(updateTasks, 1000);
    return () => {
      clearInterval(intervalId);
    };
  }, [updateTasks]);

  if (loading) {
    return (
      <Container fluid>
        <Row>
          <Col xs={12} sm={12} className="d-flex justify-content-center">
            <div className="spinner-border text-primary">
              <span className="visually-hidden">Loading...</span>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row>
        <Col xs={6} sm={6} className="align-self-baseline text-start stats">
          <i className="bi-arrow-down" /> {filesize(globalStat.downloadSpeed, fileSizeBase)}/s - <i className="bi-arrow-up" />{" "}
          {filesize(globalStat.uploadSpeed, fileSizeBase)}/s
        </Col>
        <Col xs={6} sm={6} className="align-self-baseline text-end">
          <Button
            variant="primary"
            size="sm"
            className="btn-left"
            onClick={() => {
              setShowAddTask(!showAddTask);
            }}
          >
            {!showAddTask && browser.i18n.getMessage("serverAdd")}
            {showAddTask && browser.i18n.getMessage("serverCancel")}
          </Button>
          <Button variant="danger" size="sm" className="btn-right" onClick={() => onClickPurge()}>
            {browser.i18n.getMessage("serverPurge")}
          </Button>
        </Col>
        <Col xs={12} sm={12}>
          <hr className="mt-2 mb-2" />
        </Col>
      </Row>
      {showAddTask && <ServerAddTasks aria2={aria2} server={server} />}
      {!showAddTask && tasks.length === 0 && (
        <Row>
          <Col xs={12} sm={12}>
            <em>{defaultMessage}</em>
          </Col>
        </Row>
      )}
      {!showAddTask && tasks.map((task) => <ServerTask key={task.gid} server={server} aria2={aria2} task={task} />)}
    </Container>
  );
}

export default ServerTab;
