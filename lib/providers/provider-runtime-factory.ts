import type {
  DiscoveryPersistenceService,
  DuplicateDetectionService,
} from "../database/services";

import {
  ProviderDiscoveryCoordinator,
} from "./provider-discovery-coordinator";

import {
  ProviderExecutionEngine,
} from "./provider-execution-engine";

import {
  ProviderHealthMonitor,
} from "./provider-health-monitor";

import type {
  ProviderHealthMonitorDependencies,
  ProviderHealthThresholds,
} from "./provider-health-monitor";

import {
  ProviderRegistry,
} from "./provider-registry";

import {
  ProviderRuntimeManager,
} from "./provider-runtime-manager";

export interface ProviderRuntimeFactoryOptions {
  healthThresholds?: ProviderHealthThresholds;
  healthDependencies?: ProviderHealthMonitorDependencies;
}

export interface ProviderRuntime {
  registry: ProviderRegistry;
  healthMonitor: ProviderHealthMonitor;
  runtimeManager: ProviderRuntimeManager;
  executionEngine: ProviderExecutionEngine;
  discoveryCoordinator: ProviderDiscoveryCoordinator;
}

export function createProviderRuntime(
  duplicateDetectionService:
    DuplicateDetectionService,

  discoveryPersistenceService:
    DiscoveryPersistenceService,

  options:
    ProviderRuntimeFactoryOptions = {},
): ProviderRuntime {
  const registry =
    new ProviderRegistry();

  const healthMonitor =
    new ProviderHealthMonitor(
      options.healthThresholds,
      options.healthDependencies,
    );

  const runtimeManager =
    new ProviderRuntimeManager(
      registry,
      healthMonitor,
    );

  const executionEngine =
    new ProviderExecutionEngine(
      registry,
    );

  const discoveryCoordinator =
    new ProviderDiscoveryCoordinator(
      executionEngine,
      duplicateDetectionService,
      discoveryPersistenceService,
    );

  return {
    registry,
    healthMonitor,
    runtimeManager,
    executionEngine,
    discoveryCoordinator,
  };
}
