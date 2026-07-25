import {
  ProviderConfigurationRegistry,
} from "./provider-configuration-registry";

import type {
  ProviderConfiguration,
  ProviderConfigurationPatch,
  ProviderConfigurationValue,
} from "./provider-configuration-registry";

export interface ProviderConfigurationDefaults {
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
}

export interface RegisterProviderConfigurationInput {
  providerId: string;
  enabled: boolean;
  priority: number;

  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;

  metadata?: Record<
    string,
    ProviderConfigurationValue
  >;
}

export interface ProviderConfigurationSnapshot {
  generatedAt: Date;
  totalProviders: number;
  enabledProviders: number;
  disabledProviders: number;
  configurations: ProviderConfiguration[];
}

export interface ProviderConfigurationServiceDependencies {
  now?: () => Date;

  defaults?:
    Partial<
      ProviderConfigurationDefaults
    >;
}

const DEFAULT_CONFIGURATION:
  ProviderConfigurationDefaults = {
    timeoutMs:
      10_000,

    retryAttempts:
      3,

    retryDelayMs:
      250,

    circuitBreakerThreshold:
      5,

    circuitBreakerResetMs:
      60_000,
  };

function cloneDate(
  value: Date,
): Date {
  return new Date(
    value.getTime(),
  );
}

function cloneConfiguration(
  configuration:
    ProviderConfiguration,
): ProviderConfiguration {
  return {
    ...configuration,

    metadata: {
      ...configuration.metadata,
    },
  };
}

function validateDefaults(
  defaults:
    ProviderConfigurationDefaults,
): void {
  const fields: Array<
    readonly [
      string,
      number,
    ]
  > = [
    [
      "timeoutMs",
      defaults.timeoutMs,
    ],
    [
      "retryAttempts",
      defaults.retryAttempts,
    ],
    [
      "retryDelayMs",
      defaults.retryDelayMs,
    ],
    [
      "circuitBreakerThreshold",
      defaults
        .circuitBreakerThreshold,
    ],
    [
      "circuitBreakerResetMs",
      defaults
        .circuitBreakerResetMs,
    ],
  ];

  for (
    const [
      name,
      value,
    ] of fields
  ) {
    if (
      !Number.isFinite(
        value,
      ) ||
      value < 0
    ) {
      throw new Error(
        `${name} default must be >= 0`,
      );
    }
  }
}

export class ProviderConfigurationService {
  private readonly now:
    () => Date;

  private readonly defaults:
    ProviderConfigurationDefaults;

  constructor(
    private readonly registry:
      ProviderConfigurationRegistry,

    dependencies:
      ProviderConfigurationServiceDependencies = {},
  ) {
    this.now =
      dependencies.now ??
      (() => new Date());

    this.defaults = {
      ...DEFAULT_CONFIGURATION,
      ...dependencies.defaults,
    };

    validateDefaults(
      this.defaults,
    );
  }

  register(
    input:
      RegisterProviderConfigurationInput,
  ): ProviderConfiguration {
    const configuration:
      ProviderConfiguration = {
        providerId:
          input.providerId,

        enabled:
          input.enabled,

        priority:
          input.priority,

        timeoutMs:
          input.timeoutMs ??
          this.defaults.timeoutMs,

        retryAttempts:
          input.retryAttempts ??
          this.defaults.retryAttempts,

        retryDelayMs:
          input.retryDelayMs ??
          this.defaults.retryDelayMs,

        circuitBreakerThreshold:
          input
            .circuitBreakerThreshold ??
          this.defaults
            .circuitBreakerThreshold,

        circuitBreakerResetMs:
          input
            .circuitBreakerResetMs ??
          this.defaults
            .circuitBreakerResetMs,

        metadata: {
          ...(input.metadata ?? {}),
        },
      };

    this.registry.register(
      configuration,
    );

    return cloneConfiguration(
      configuration,
    );
  }

  update(
    providerId: string,
    patch:
      ProviderConfigurationPatch,
  ): ProviderConfiguration {
    if (
      patch.metadata === undefined
    ) {
      return this.registry.update(
        providerId,
        patch,
      );
    }

    const existing =
      this.require(
        providerId,
      );

    return this.registry.update(
      providerId,
      {
        ...patch,

        metadata: {
          ...existing.metadata,
          ...patch.metadata,
        },
      },
    );
  }

  enable(
    providerId: string,
  ): ProviderConfiguration {
    return this.registry.update(
      providerId,
      {
        enabled:
          true,
      },
    );
  }

  disable(
    providerId: string,
  ): ProviderConfiguration {
    return this.registry.update(
      providerId,
      {
        enabled:
          false,
      },
    );
  }

  setPriority(
    providerId: string,
    priority: number,
  ): ProviderConfiguration {
    return this.registry.update(
      providerId,
      {
        priority,
      },
    );
  }

  setMetadata(
    providerId: string,
    key: string,
    value:
      ProviderConfigurationValue,
  ): ProviderConfiguration {
    if (
      key.trim().length === 0
    ) {
      throw new Error(
        "Metadata key must not be empty",
      );
    }

    const existing =
      this.require(
        providerId,
      );

    return this.registry.update(
      providerId,
      {
        metadata: {
          ...existing.metadata,

          [key]:
            value,
        },
      },
    );
  }

  removeMetadata(
    providerId: string,
    key: string,
  ): ProviderConfiguration {
    const existing =
      this.require(
        providerId,
      );

    const metadata = {
      ...existing.metadata,
    };

    delete metadata[key];

    return this.registry.update(
      providerId,
      {
        metadata,
      },
    );
  }

  get(
    providerId: string,
  ): ProviderConfiguration | null {
    return this.registry.get(
      providerId,
    );
  }

  require(
    providerId: string,
  ): ProviderConfiguration {
    const configuration =
      this.registry.get(
        providerId,
      );

    if (
      !configuration
    ) {
      throw new Error(
        `Provider configuration "${providerId}" was not found`,
      );
    }

    return configuration;
  }

  listEnabled():
    ProviderConfiguration[] {
    return this.registry
      .list()
      .filter(
        configuration =>
          configuration.enabled,
      );
  }

  listDisabled():
    ProviderConfiguration[] {
    return this.registry
      .list()
      .filter(
        configuration =>
          !configuration.enabled,
      );
  }

  remove(
    providerId: string,
  ): boolean {
    return this.registry.remove(
      providerId,
    );
  }

  snapshot():
    ProviderConfigurationSnapshot {
    const configurations =
      this.registry.list();

    const enabledProviders =
      configurations.filter(
        configuration =>
          configuration.enabled,
      ).length;

    return {
      generatedAt:
        cloneDate(
          this.now(),
        ),

      totalProviders:
        configurations.length,

      enabledProviders,

      disabledProviders:
        configurations.length -
        enabledProviders,

      configurations:
        configurations.map(
          cloneConfiguration,
        ),
    };
  }

  clear(): void {
    this.registry.clear();
  }
}
