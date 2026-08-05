const controllers = new Map<string, AbortController>();

export function registerUrlImport(runId: string) {
  const existing = controllers.get(runId);
  if (existing && !existing.signal.aborted) throw new Error("An import with this ID is already running.");
  const controller = new AbortController();
  controllers.set(runId, controller);
  return controller;
}

export function stopUrlImport(runId: string) {
  const controller = controllers.get(runId);
  if (!controller || controller.signal.aborted) return false;
  controller.abort(new Error("IMPORT_STOPPED"));
  return true;
}

export function unregisterUrlImport(runId: string) {
  controllers.delete(runId);
}
