import { Button } from "react-bootstrap";
import { Task } from "@/popup/models/task";
import { captureURL } from "@/models/aria2-extension";
import Server from "@/models/server";

interface Props {
  aria2: any;
  server: Server;
  task: Task;
}

function ServerTaskManagement({ aria2, server, task }: Props) {
  const onClickPlayPause = () => {
    if (task.isActive()) {
      aria2.call("aria2.pause", task.gid);
    } else if (task.isPaused()) {
      aria2.call("aria2.unpause", task.gid);
    } else if (task.isError()) {
      captureURL(aria2, server, task.files[0].uris[0].uri, "", "", undefined, task.cachedFilename);
    }
  };

  const onClickDelete = () => {
    if (task.isComplete() || task.isError() || task.isRemoved()) {
      aria2.call("aria2.removeDownloadResult", task.gid);
    } else {
      aria2.call("aria2.remove", task.gid);
    }
  };

  if (task.isActive() || task.isPaused() || task.isError()) {
    return (
      <>
        <Button variant="primary" size="sm" className="btn-left" onClick={onClickPlayPause}>
          {task.isActive() && <i className="bi bi-pause" />}
          {task.isPaused() && <i className="bi bi-play" />}
          {task.isError() && <i className="bi bi-arrow-repeat" />}
        </Button>
        <Button variant="danger" size="sm" className="btn-right" onClick={onClickDelete}>
          <i className="bi bi-trash" />
        </Button>
      </>
    );
  }
  return (
    <Button variant="danger" size="sm" onClick={onClickDelete}>
      <i className="bi bi-trash" />
    </Button>
  );
}

export default ServerTaskManagement;
