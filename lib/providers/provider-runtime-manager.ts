import type {
  DealProvider,
} from "./provider";

import {
  ProviderHealthMonitor,
} from "./provider-health-monitor";

import type {
  ProviderHealthSnapshot,
  ProviderHealthSummary,
} from "./provider-health-monitor";

import {
  ProviderRegistry,
} from "./provider-registry";

import {
  ResilientProvider,
} from "./resilient-provider";

import type {
  ProviderReliabilityStatistics,
  ProviderRetryPolicy,
  ResilientProviderDependencies,
} from "./resilient-provider";

export interface ProviderRuntimeRegistration {
  provider: DealProvider;
  retryPolicy?: ProviderRetryPolicy;
  dependencies?: ResilientProviderDependencies;
}

export interface ProviderRuntimeSnapshot {
  providerId: string;
  reliability: ProviderReliabilityStatistics;
  health: ProviderHealthSnapshot;
}

export class ProviderRuntimeManager {
  private readonly resilientProviders =
    new Map<
      string,
      ResilientProvider
    >();

  constructor(
    private readonly registry:
      ProviderRegistry,

    private readonly healthMonitor:
      ProviderHealthMonitor,
  ) {}

  register(
    registration:
      ProviderRuntimeRegistration,
  ): ResilientProvider {
    const metadata =
      registration.provider.metadata();

    if (
      this.resilientProviders.has(
        metadata.id,
      )
    ) {
      throw new Error(
        `Provider "${metadata.id}" is already registered in the runtime manager`,
      );
    }

    if (
      this.registry.get(
        metadata.id,
      )
    ) {
      throw new Error(
        `Provider "${metadata.id}" is already registered in the provider registry`,
      );
    }

    if (
      this.healthMonitor.has(
        metadata.id,
      )
    ) {
      throw new Error(
        `Provider "${metadata.id}" is already registered in the health monitor`,
      );
    }

    const resilientProvider =
      new ResilientProvider(
        registration.provider,
        registration.retryPolicy,
        registration.dependencies,
      );

    this.registry.register(
      resilientProvider,
    );

    this.healthMonitor.register(
      resilientProvider,
    );

    this.resilientProviders.set(
      metadata.id,
      resilientProvider,
    );

    return resilientProvider;
  }

  registerMany(
    registrations:
      ProviderRuntimeRegistration[],
  ): ResilientProvider[] {
    return registrations.map(
      registration =>
        this.register(
          registration,
        ),
    );
  }

  has(
    providerId: string,
  ): boolean {
    return this.resilientProviders.has(
      providerId,
    );
  }

  get(
    providerId: string,
  ): ResilientProvider | null {
    return (
      this.resilientProviders.get(
        providerId,
      ) ??
      null
    );
  }

  list():
    ResilientProvider[] {
    return this.registry
      .list()
      .map(
        provider =>
          this.resilientProviders.get(
            provider.metadata().id,
          ),
      )
      .filter(
        (
          provider,
        ): provider is ResilientProvider =>
          provider !== undefined,
      );
  }

  statistics(
    providerId: string,
  ): ProviderReliabilityStatistics | null {
    const provider =
      this.resilientProviders.get(
        providerId,
      );

    if (
      !provider
    ) {
      return null;
    }

    return provider.statistics();
  }

  health(
    providerId: string,
  ): ProviderHealthSnapshot | null {
    if (
      !this.resilientProviders.has(
        providerId,
      )
    ) {
      return null;
    }

    return this.healthMonitor.get(
      providerId,
    );
  }

  snapshot(
    providerId: string,
  ): ProviderRuntimeSnapshot | null {
    const reliability =
      this.statistics(
        providerId,
      );

    const health =
      this.health(
        providerId,
      );

    if (
      !reliability ||
      !health
    ) {
      return null;
    }

    return {
      providerId,
      reliability,
      health,
    };
  }

  healthSummary():
    ProviderHealthSummary {
    return this.healthMonitor.summary();
  }

  resetCircuit(
    providerId: string,
  ): void {
    if (
      !this.resilientProviders.has(
        providerId,
      )
    ) {
      throw new Error(
        `Provider "${providerId}" is not registered in the runtime manager`,
      );
    }

    this.healthMonitor.resetCircuit(
      providerId,
    );
  }
}
