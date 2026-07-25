import type {
  DiscoveryContext,
} from "./provider";

import type {
  ProviderControlPlane,
  ProviderControlPlaneOverview,
} from "./provider-control-plane";

import type {
  ProviderDiscoveryCoordinatorOptions,
  ProviderDiscoveryCoordinatorSummary,
} from "./provider-discovery-coordinator";

import type {
  ProviderRunHistoryQuery,
  ProviderRunHistoryResult,
  ProviderRunHistoryService,
  ProviderRunRecord,
} from "./provider-run-history";

import type {
  ProviderRuntimeRegistration,
  ProviderRuntimeSnapshot,
} from "./provider-runtime-manager";

export interface ProviderOperationsDashboard {
  generatedAt: Date;
  overview: ProviderControlPlaneOverview;
  latestRun: ProviderRunRecord | null;
  recentRuns: ProviderRunHistoryResult;
}

export interface ProviderOperationsFacadeDependencies {
  now?: () => Date;
  recentRunLimit?: number;
}

function cloneDate(
  value: Date,
): Date {
  return new Date(
    value.getTime(),
  );
}

export class ProviderOperationsFacade {
  private readonly now:
    () => Date;

  private readonly recentRunLimit:
    number;

  constructor(
    private readonly controlPlane:
      ProviderControlPlane,

    private readonly runHistory:
      ProviderRunHistoryService,

    dependencies:
      ProviderOperationsFacadeDependencies = {},
  ) {
    this.now =
      dependencies.now ??
      (() => new Date());

    this.recentRunLimit =
      dependencies.recentRunLimit ??
      10;

    if (
      !Number.isInteger(
        this.recentRunLimit,
      ) ||
      this.recentRunLimit < 1 ||
      this.recentRunLimit > 500
    ) {
      throw new Error(
        "recentRunLimit must be an integer between 1 and 500",
      );
    }
  }

  register(
    registration:
      ProviderRuntimeRegistration,
  ): void {
    this.controlPlane.register(
      registration,
    );
  }

  registerMany(
    registrations:
      ProviderRuntimeRegistration[],
  ): void {
    this.controlPlane.registerMany(
      registrations,
    );
  }

  async discoverAll(
    context: DiscoveryContext,
    options:
      ProviderDiscoveryCoordinatorOptions = {},
  ): Promise<ProviderDiscoveryCoordinatorSummary> {
    return this.runHistory.execute(
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
      !this.controlPlane.provider(
        providerId,
      )
    ) {
      throw new Error(
        `Provider "${providerId}" is not registered in the operations facade`,
      );
    }

    return this.runHistory.execute(
      context,
      {
        ...options,

        providerIds: [
          providerId,
        ],
      },
    );
  }

  provider(
    providerId: string,
  ): ProviderRuntimeSnapshot | null {
    return this.controlPlane.provider(
      providerId,
    );
  }

  history(
    query:
      ProviderRunHistoryQuery = {},
  ): ProviderRunHistoryResult {
    return this.runHistory.list(
      query,
    );
  }

  run(
    runId: string,
  ): ProviderRunRecord | null {
    return this.runHistory.get(
      runId,
    );
  }

  latestRun():
    ProviderRunRecord | null {
    return this.runHistory.latest();
  }

  resetCircuit(
    providerId: string,
  ): ProviderRuntimeSnapshot {
    return this.controlPlane.resetCircuit(
      providerId,
    );
  }

  dashboard():
    ProviderOperationsDashboard {
    return {
      generatedAt:
        cloneDate(
          this.now(),
        ),

      overview:
        this.controlPlane.overview(),

      latestRun:
        this.runHistory.latest(),

      recentRuns:
        this.runHistory.list({
          limit:
            this.recentRunLimit,

          offset:
            0,
        }),
    };
  }
}
