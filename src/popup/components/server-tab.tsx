import Aria2 from "@baptistecdr/aria2";
import { filesize } from "filesize";
import { useCallback, useEffect, useState } from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import type { Server } from "@/models/server";
import ServerAddTasks from "@/popup/components/server-add-tasks";
import ServerTask from "@/popup/components/server-task";
import { Task } from "@/popup/models/task";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap";
import "./server-tab.css";
import i18n from "@/i18n";
import { LoadingSpinner } from "@/popup/components/loading-spinner";
import { defaultGlobalStat, type GlobalStat, parseGlobalStat } from "@/popup/models/global-stat";

const FILESIZE_BASE = { base: 2 } as const;
const POLL_INTERVAL_MS = 1000; // 1 second

interface Props {
  server: Server;
}

type TaskGroups = [Task[][], Task[][], Task[][]];

async function getGlobalStat(aria2server: Aria2): Promise<GlobalStat> {
  const globalStat = await aria2server.call("getGlobalStat", [], {});
  return parseGlobalStat(globalStat);
}

async function getTasks(aria2server: Aria2, numWaiting: number, numStopped: number): Promise<Task[]> {
  const result = (await aria2server.multicall([["tellActive"], ["tellWaiting", 0, numWaiting], ["tellStopped", 0, numStopped]])) as TaskGroups;
  return Task.parseMany(result.flatMap(([tasks]) => (Array.isArray(tasks) ? tasks : [])));
}

function ServerTab({ server }: Props) {
  const [loading, setLoading] = useState(true);
  const [aria2] = useState(new Aria2(server));
  const [globalStat, setGlobalStat] = useState(defaultGlobalStat());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [defaultMessage, setDefaultMessage] = useState(i18n("serverNoTasks"));

  const onClickPurge = () => {
    aria2.call("aria2.purgeDownloadResult");
  };

  const toggleAddTask = useCallback(() => {
    setShowAddTask((prev) => !prev);
  }, []);

  const updateTasks = useCallback(async () => {
    try {
      const stat = await getGlobalStat(aria2);
      const fetchedTasks = await getTasks(aria2, stat.numWaiting, stat.numStopped);
      setGlobalStat(stat);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error(error);
      setDefaultMessage(i18n("serverError"));
    }
    setLoading(false);
  }, [aria2]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const poll = async () => {
      await updateTasks();
      if (!cancelled) {
        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [updateTasks]);

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
            <em>{defaultMessage}</em>
          </Col>
        </Row>
      )}
      {showTaskList && tasks.map((task) => <ServerTask key={task.gid} server={server} aria2={aria2} task={task} />)}
    </Container>
  );
}

export default ServerTab;
