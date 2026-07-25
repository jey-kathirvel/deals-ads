import type {
  DiscoveryPersistenceService,
  DuplicateDetectionService,
} from "../database/services";

import {
  ProviderControlPlane,
} from "./provider-control-plane";

import type {
  ProviderControlPlaneDependencies,
} from "./provider-control-plane";

import {
  ProviderOperationsFacade,
} from "./provider-operations-facade";

import type {
  ProviderOperationsFacadeDependencies,
} from "./provider-operations-facade";

import {
  createProviderRuntime,
} from "./provider-runtime-factory";

import type {
  ProviderRuntime,
  ProviderRuntimeFactoryOptions,
} from "./provider-runtime-factory";

import {
  ProviderRunHistoryService,
} from "./provider-run-history";

import type {
  ProviderRunHistoryDependencies,
} from "./provider-run-history";

export interface ProviderOperationsRuntimeFactoryOptions {
  runtime?: ProviderRuntimeFactoryOptions;

  controlPlane?:
    ProviderControlPlaneDependencies;

  runHistory?:
    ProviderRunHistoryDependencies;

  operations?:
    ProviderOperationsFacadeDependencies;
}

export interface ProviderOperationsRuntime
  extends ProviderRuntime {
  controlPlane:
    ProviderControlPlane;

  runHistory:
    ProviderRunHistoryService;

  operations:
    ProviderOperationsFacade;
}

export function createProviderOperationsRuntime(
  duplicateDetectionService:
    DuplicateDetectionService,

  discoveryPersistenceService:
    DiscoveryPersistenceService,

  options:
    ProviderOperationsRuntimeFactoryOptions = {},
): ProviderOperationsRuntime {
  const runtime =
    createProviderRuntime(
      duplicateDetectionService,
      discoveryPersistenceService,
      options.runtime,
    );

  const controlPlane =
    new ProviderControlPlane(
      runtime.runtimeManager,
      runtime.discoveryCoordinator,
      options.controlPlane,
    );

  const runHistory =
    new ProviderRunHistoryService(
      runtime.discoveryCoordinator,
      options.runHistory,
    );

  const operations =
    new ProviderOperationsFacade(
      controlPlane,
      runHistory,
      options.operations,
    );

  return {
    ...runtime,
    controlPlane,
    runHistory,
    operations,
  };
}
