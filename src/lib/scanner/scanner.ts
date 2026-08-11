/**
 * Scanner controller (main thread side).
 * Owns the worker lifecycle, queues roots, exposes live progress and never
 * blocks a page render. Scans continue while the user browses.
 */

import { log } from "../core/logger";
import { rootsStore } from "../core/indexdb";
import type { RootRecord, ScanIssue, ScanProgress } from "../core/types";

type Listener = (progress: ScanProgress | null) => void;

interface WorkerDone {
  type: "done" | "cancelled";
  counters: Omit<ScanProgress, "rootId" | "rootName" | "state" | "currentPath" | "startedAt" | "issues">;
  issues: ScanIssue[];
  startedAt: number;
  finishedAt: number;
}

interface WorkerProgress {
  type: "progress";
  counters: WorkerDone["counters"];
  currentPath: string;
  issues: ScanIssue[];
  startedAt: number;
}

interface WorkerError {
  type: "error";
  message: string;
}

class ScannerService {
  private worker: Worker | null = null;
  private listeners = new Set<Listener>();
  private queue: { root: RootRecord; mode: "full" | "incremental"; deepDetect: boolean }[] = [];
  private current: ScanProgress | null = null;
  private resolveCurrent: (() => void) | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => this.listeners.delete(listener);
  }

  get progress(): ScanProgress | null {
    return this.current;
  }

  get isRunning(): boolean {
    return this.current?.state === "scanning" || this.current?.state === "cancelling";
  }

  private emit() {
    for (const listener of this.listeners) listener(this.current ? { ...this.current } : null);
  }

  /** Queues a scan. Resolves when this root finished (or was cancelled). */
  enqueue(root: RootRecord, mode: "full" | "incremental" = "incremental", deepDetect = false): Promise<void> {
    this.queue.push({ root, mode, deepDetect });
    void this.drain();
    return new Promise((resolve) => {
      const unsubscribe = this.subscribe((progress) => {
        if (progress && progress.rootId === root.id && (progress.state === "done" || progress.state === "error")) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  cancel() {
    if (!this.worker || !this.current) return;
    this.queue = [];
    this.current = { ...this.current, state: "cancelling" };
    this.emit();
    this.worker.postMessage({ type: "cancel" });
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL("./scanner.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<WorkerProgress | WorkerDone | WorkerError>) => {
      void this.handleMessage(event.data);
    };
    this.worker.onerror = (event) => {
      log.error("scanner", "worker crashed", { message: event.message });
      if (this.current) {
        this.current = { ...this.current, state: "error", error: event.message, finishedAt: Date.now() };
        this.emit();
      }
      this.finish();
    };
    return this.worker;
  }

  private async handleMessage(message: WorkerProgress | WorkerDone | WorkerError) {
    if (!this.current) return;
    if (message.type === "error") {
      log.error("scanner", `scan failed for ${this.current.rootName}`, message.message);
      this.current = { ...this.current, state: "error", error: message.message, finishedAt: Date.now() };
      this.emit();
      this.finish();
      return;
    }
    if (message.type === "progress") {
      this.current = {
        ...this.current,
        ...message.counters,
        currentPath: message.currentPath,
        issues: message.issues,
      };
      this.emit();
      return;
    }

    const finished: ScanProgress = {
      ...this.current,
      ...message.counters,
      issues: message.issues,
      state: "done",
      finishedAt: message.finishedAt,
    };
    this.current = finished;
    this.emit();

    const root = await rootsStore.get(finished.rootId);
    if (root) {
      await rootsStore.put({ ...root, lastScanAt: Date.now(), itemCount: message.counters.mediaFound });
    }
    log.info("scanner", `scan ${message.type} for ${finished.rootName}`, message.counters);
    this.finish();
  }

  private finish() {
    this.resolveCurrent?.();
    this.resolveCurrent = null;
    void this.drain();
  }

  private async drain() {
    if (this.isRunning) return;
    const job = this.queue.shift();
    if (!job) return;

    this.current = {
      rootId: job.root.id,
      rootName: job.root.name,
      state: "scanning",
      directoriesSeen: 0,
      filesSeen: 0,
      mediaFound: 0,
      subtitlesFound: 0,
      added: 0,
      updated: 0,
      removed: 0,
      renamed: 0,
      currentPath: "/",
      startedAt: Date.now(),
      issues: [],
    };
    this.emit();
    log.info("scanner", `scan started for ${job.root.name}`, { mode: job.mode });

    const worker = this.ensureWorker();
    await new Promise<void>((resolve) => {
      this.resolveCurrent = resolve;
      worker.postMessage({
        type: "start",
        rootId: job.root.id,
        rootName: job.root.name,
        handle: job.root.handle,
        mode: job.mode,
        deepDetect: job.deepDetect,
      });
    });
  }
}

export const scanner = new ScannerService();
