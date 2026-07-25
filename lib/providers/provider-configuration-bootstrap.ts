import {
  ProviderConfigurationRegistry,
} from "./provider-configuration-registry";

import type {
  ProviderConfiguration,
} from "./provider-configuration-registry";

import {
  ProviderConfigurationService,
} from "./provider-configuration-service";

import type {
  ProviderConfigurationServiceDependencies,
  RegisterProviderConfigurationInput,
} from "./provider-configuration-service";

export interface ProviderConfigurationBootstrapOptions {
  defaults?:
    ProviderConfigurationServiceDependencies;

  providers?:
    RegisterProviderConfigurationInput[];

  requireProviders?:
    boolean;
}

export interface ProviderConfigurationBootstrapResult {
  registry:
    ProviderConfigurationRegistry;

  service:
    ProviderConfigurationService;

  configurations:
    ProviderConfiguration[];
}

export function bootstrapProviderConfiguration(
  options:
    ProviderConfigurationBootstrapOptions = {},
): ProviderConfigurationBootstrapResult {
  const registry =
    new ProviderConfigurationRegistry();

  const service =
    new ProviderConfigurationService(
      registry,
      options.defaults,
    );

  const providers =
    options.providers ?? [];

  if (
    options.requireProviders &&
    providers.length === 0
  ) {
    throw new Error(
      "At least one provider configuration is required",
    );
  }

  for (const provider of providers) {
    service.register(
      provider,
    );
  }

  return {
    registry,
    service,
    configurations:
      registry.list(),
  };
}
