export type ProviderConfigurationValue =
  | string
  | number
  | boolean
  | null;

export interface ProviderConfiguration {
  providerId: string;
  enabled: boolean;
  priority: number;
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
  metadata: Record<
    string,
    ProviderConfigurationValue
  >;
}

export interface ProviderConfigurationPatch {
  enabled?: boolean;
  priority?: number;
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

function cloneConfiguration(
  configuration: ProviderConfiguration,
): ProviderConfiguration {
  return {
    ...configuration,
    metadata: {
      ...configuration.metadata,
    },
  };
}

function validate(
  configuration: ProviderConfiguration,
): void {
  if (
    configuration.providerId.trim()
      .length === 0
  ) {
    throw new Error(
      "providerId must not be empty",
    );
  }

  const positiveFields: Array<
    readonly [
      string,
      number,
    ]
  > = [
    [
      "timeoutMs",
      configuration.timeoutMs,
    ],
    [
      "retryAttempts",
      configuration.retryAttempts,
    ],
    [
      "retryDelayMs",
      configuration.retryDelayMs,
    ],
    [
      "circuitBreakerThreshold",
      configuration
        .circuitBreakerThreshold,
    ],
    [
      "circuitBreakerResetMs",
      configuration
        .circuitBreakerResetMs,
    ],
  ];

  for (const [name, value] of positiveFields) {
    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new Error(
        `${name} must be >= 0`,
      );
    }
  }

  if (
    !Number.isFinite(
      configuration.priority,
    )
  ) {
    throw new Error(
      "priority must be finite",
    );
  }
}

export class ProviderConfigurationRegistry {
  private readonly configurations =
    new Map<
      string,
      ProviderConfiguration
    >();

  register(
    configuration:
      ProviderConfiguration,
  ): void {
    validate(configuration);

    if (
      this.configurations.has(
        configuration.providerId,
      )
    ) {
      throw new Error(
        `Configuration already exists for "${configuration.providerId}"`,
      );
    }

    this.configurations.set(
      configuration.providerId,
      cloneConfiguration(
        configuration,
      ),
    );
  }

  update(
    providerId: string,
    patch:
      ProviderConfigurationPatch,
  ): ProviderConfiguration {
    const existing =
      this.configurations.get(
        providerId,
      );

    if (!existing) {
      throw new Error(
        `Unknown provider "${providerId}"`,
      );
    }

    const updated: ProviderConfiguration =
      {
        ...existing,
        ...patch,
        metadata:
          patch.metadata
            ? {
                ...patch.metadata,
              }
            : {
                ...existing.metadata,
              },
      };

    validate(updated);

    this.configurations.set(
      providerId,
      cloneConfiguration(
        updated,
      ),
    );

    return cloneConfiguration(
      updated,
    );
  }

  get(
    providerId: string,
  ): ProviderConfiguration | null {
    const configuration =
      this.configurations.get(
        providerId,
      );

    return configuration
      ? cloneConfiguration(
          configuration,
        )
      : null;
  }

  list(): ProviderConfiguration[] {
    return [
      ...this.configurations.values(),
    ]
      .sort(
        (
          left,
          right,
        ) =>
          left.priority -
          right.priority,
      )
      .map(
        cloneConfiguration,
      );
  }

  remove(
    providerId: string,
  ): boolean {
    return this.configurations.delete(
      providerId,
    );
  }

  count(): number {
    return this.configurations.size;
  }

  clear(): void {
    this.configurations.clear();
  }
}
