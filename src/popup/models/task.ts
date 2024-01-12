import "reflect-metadata";
import { Transform, Type } from "class-transformer";
import { File } from "./file";

export enum TaskStatus {
  Active = "active",
  Complete = "complete",
  Error = "error",
  Paused = "paused",
  Removed = "removed",
  Waiting = "waiting",
}

export class Task {
  bittorrent?: Bittorrent;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  completedLength: number;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  connections: number;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  downloadSpeed: number;

  files: File[];

  gid: string;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  numSeeders: number;

  status: TaskStatus;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  totalLength: number;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  uploadLength: number;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  uploadSpeed: number;

  errorMessage: string;

  constructor(
    completedLength: number,
    connections: number,
    downloadSpeed: number,
    files: File[],
    gid: string,
    numSeeders: number,
    status: TaskStatus,
    totalLength: number,
    uploadLength: number,
    uploadSpeed: number,
    errorMessage: string,
    bittorrent?: Bittorrent,
  ) {
    this.bittorrent = bittorrent;
    this.completedLength = completedLength;
    this.connections = connections;
    this.downloadSpeed = downloadSpeed;
    this.files = files;
    this.gid = gid;
    this.numSeeders = numSeeders;
    this.status = status;
    this.totalLength = totalLength;
    this.uploadLength = uploadLength;
    this.uploadSpeed = uploadSpeed;
    this.errorMessage = errorMessage;
  }

  isActive(): boolean {
    return this.status === TaskStatus.Active;
  }

  isComplete(): boolean {
    return this.status === TaskStatus.Complete;
  }

  isError(): boolean {
    return this.status === TaskStatus.Error;
  }

  isPaused(): boolean {
    return this.status === TaskStatus.Paused;
  }

  isRemoved(): boolean {
    return this.status === TaskStatus.Removed;
  }

  isWaiting(): boolean {
    return this.status === TaskStatus.Waiting;
  }
}

export interface Bittorrent {
  info: {
    name: string;
  };
}
