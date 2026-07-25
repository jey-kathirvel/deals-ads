import type {
  DiscoveryContext,
} from "./provider";

import type {
  ProviderDiscoveryCoordinator,
  ProviderDiscoveryCoordinatorOptions,
  ProviderDiscoveryCoordinatorSummary,
} from "./provider-discovery-coordinator";

import type {
  ProviderHealthSnapshot,
  ProviderHealthSummary,
} from "./provider-health-monitor";

import type {
  ProviderReliabilityStatistics,
} from "./resilient-provider";

import type {
  ProviderRuntimeManager,
  ProviderRuntimeRegistration,
  ProviderRuntimeSnapshot,
} from "./provider-runtime-manager";

export interface ProviderControlPlaneOverview {
  generatedAt: Date;
  registeredProviders: number;
  enabledProviders: number;
  disabledProviders: number;
  health: ProviderHealthSummary;
  providers: ProviderControlPlaneProviderOverview[];
}

export interface ProviderControlPlaneProviderOverview {
  providerId: string;
  providerName: string;
  enabled: boolean;
  priority: number;
  reliability: ProviderReliabilityStatistics;
  health: ProviderHealthSnapshot;
}

export interface ProviderControlPlaneDependencies {
  now?: () => Date;
}

function cloneDate(
  value: Date,
): Date {
  return new Date(
    value.getTime(),
  );
}

function cloneReliability(
  reliability: ProviderReliabilityStatistics,
): ProviderReliabilityStatistics {
  return {
    ...reliability,

    circuitOpenedAt:
      reliability.circuitOpenedAt
        ? cloneDate(
            reliability.circuitOpenedAt,
          )
        : null,
  };
}

function cloneHealth(
  health: ProviderHealthSnapshot,
): ProviderHealthSnapshot {
  return {
    ...health,

    circuitOpenedAt:
      health.circuitOpenedAt
        ? cloneDate(
            health.circuitOpenedAt,
          )
        : null,

    checkedAt:
      cloneDate(
        health.checkedAt,
      ),
  };
}

function cloneHealthSummary(
  summary: ProviderHealthSummary,
): ProviderHealthSummary {
  return {
    ...summary,

    checkedAt:
      cloneDate(
        summary.checkedAt,
      ),

    providers:
      summary.providers.map(
        cloneHealth,
      ),
  };
}

export class ProviderControlPlane {
  private readonly now:
    () => Date;

  constructor(
    private readonly runtimeManager:
      ProviderRuntimeManager,

    private readonly discoveryCoordinator:
      ProviderDiscoveryCoordinator,

    dependencies:
      ProviderControlPlaneDependencies = {},
  ) {
    this.now =
      dependencies.now ??
      (() => new Date());
  }

  register(
    registration:
      ProviderRuntimeRegistration,
  ): void {
    this.runtimeManager.register(
      registration,
    );
  }

  registerMany(
    registrations:
      ProviderRuntimeRegistration[],
  ): void {
    this.runtimeManager.registerMany(
      registrations,
    );
  }

  async discoverAll(
    context: DiscoveryContext,
    options:
      ProviderDiscoveryCoordinatorOptions = {},
  ): Promise<ProviderDiscoveryCoordinatorSummary> {
    return this.discoveryCoordinator.run(
      context,
      options,
    );
  }

  async discoverProvider(
    providerId: string,
    context: DiscoveryContext,
    options:
      Omit<
        ProviderDiscoveryCoordinatorOptions,
        "providerIds"
      > = {},
  ): Promise<ProviderDiscoveryCoordinatorSummary> {
    if (
      !this.runtimeManager.has(
        providerId,
      )
    ) {
      throw new Error(
        `Provider "${providerId}" is not registered in the control plane`,
      );
    }

    return this.discoveryCoordinator.runProvider(
      providerId,
      context,
      options,
    );
  }

  provider(
    providerId: string,
  ): ProviderRuntimeSnapshot | null {
    const snapshot =
      this.runtimeManager.snapshot(
        providerId,
      );

    if (
      !snapshot
    ) {
      return null;
    }

    return {
      providerId:
        snapshot.providerId,

      reliability:
        cloneReliability(
          snapshot.reliability,
        ),

      health:
        cloneHealth(
          snapshot.health,
        ),
    };
  }

  overview():
    ProviderControlPlaneOverview {
    const generatedAt =
      this.now();

    const health =
      this.runtimeManager.healthSummary();

    const providers =
      this.runtimeManager
        .list()
        .map(
          provider => {
            const metadata =
              provider.metadata();

            const snapshot =
              this.runtimeManager.snapshot(
                metadata.id,
              );

            if (
              !snapshot
            ) {
              throw new Error(
                `Runtime snapshot is unavailable for provider "${metadata.id}"`,
              );
            }

            return {
              providerId:
                metadata.id,

              providerName:
                metadata.name,

              enabled:
                metadata.enabled,

              priority:
                metadata.priority,

              reliability:
                cloneReliability(
                  snapshot.reliability,
                ),

              health:
                cloneHealth(
                  snapshot.health,
                ),
            };
          },
        );

    return {
      generatedAt:
        cloneDate(
          generatedAt,
        ),

      registeredProviders:
        providers.length,

      enabledProviders:
        providers.filter(
          provider =>
            provider.enabled,
        ).length,

      disabledProviders:
        providers.filter(
          provider =>
            !provider.enabled,
        ).length,

      health:
        cloneHealthSummary(
          health,
        ),

      providers,
    };
  }

  resetCircuit(
    providerId: string,
  ): ProviderRuntimeSnapshot {
    if (
      !this.runtimeManager.has(
        providerId,
      )
    ) {
      throw new Error(
        `Provider "${providerId}" is not registered in the control plane`,
      );
    }

    this.runtimeManager.resetCircuit(
      providerId,
    );

    const snapshot =
      this.provider(
        providerId,
      );

    if (
      !snapshot
    ) {
      throw new Error(
        `Provider "${providerId}" snapshot is unavailable after circuit reset`,
      );
    }

    return snapshot;
  }
}
