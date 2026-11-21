import { Button } from "react-bootstrap";
import type { Server } from "@/domain/server";
import { Task } from "@/domain/task";
import type { Aria2Client } from "@/services/aria2-client";
import { captureUrl } from "@/services/capture";
import { runLoggingErrors } from "@/services/run-logging-errors";
import { useCurrentTab } from "@/shared/ui/current-tab-provider";

interface Props {
  server: Server;
  aria2: Aria2Client;
  task: Task;
}

function ServerTaskManagement({ server, aria2, task }: Props) {
  const currentTab = useCurrentTab();

  const playPauseOrRetry = () => {
    if (Task.isActive(task)) {
      return aria2.pause(task.gid);
    }
    if (Task.isPaused(task)) {
      return aria2.unpause(task.gid);
    }
    // Failed: download it again.
    return captureUrl(aria2, server, {
      url: task.files[0].uris[0].uri,
      incognito: !!currentTab?.incognito,
      directory: task.dir,
      filename: Task.filename(task),
    });
  };

  const onClickPlayPauseRetry = () => runLoggingErrors(playPauseOrRetry);

  const onClickDelete = () => runLoggingErrors(() => (Task.isStopped(task) ? aria2.removeDownloadResult(task.gid) : aria2.remove(task.gid)));

  if (Task.isActive(task) || Task.isPaused(task) || Task.isError(task)) {
    return (
      <>
        <Button variant="primary" size="sm" className="btn-left" aria-label="play-pause-retry" onClick={onClickPlayPauseRetry}>
          {Task.isActive(task) && <i className="bi bi-pause" />}
          {Task.isPaused(task) && <i className="bi bi-play" />}
          {Task.isError(task) && <i className="bi bi-arrow-repeat" />}
        </Button>
        <Button variant="danger" size="sm" className="btn-right" aria-label="delete" onClick={onClickDelete}>
          <i className="bi bi-trash" />
        </Button>
      </>
    );
  }
  return (
    <Button variant="danger" size="sm" aria-label="delete" onClick={onClickDelete}>
      <i className="bi bi-trash" />
    </Button>
  );
}

export default ServerTaskManagement;
