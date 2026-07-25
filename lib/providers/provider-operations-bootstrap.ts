import type {
  DiscoveryPersistenceService,
  DuplicateDetectionService,
} from "../database/services";

import {
  createProviderOperationsRuntime,
} from "./provider-operations-runtime-factory";

import type {
  ProviderOperationsRuntime,
  ProviderOperationsRuntimeFactoryOptions,
} from "./provider-operations-runtime-factory";

import type {
  ProviderRuntimeRegistration,
} from "./provider-runtime-manager";

export interface ProviderOperationsBootstrapOptions {
  runtime?:
    ProviderOperationsRuntimeFactoryOptions;

  providers?:
    ProviderRuntimeRegistration[];

  requireProviders?:
    boolean;
}

export interface ProviderOperationsBootstrapResult {
  runtime:
    ProviderOperationsRuntime;

  registeredProviderIds:
    string[];

  registeredProviders:
    number;
}

function validateRegistrations(
  registrations:
    ProviderRuntimeRegistration[],
): void {
  const providerIds =
    new Set<string>();

  for (
    const registration
    of registrations
  ) {
    const metadata =
      registration.provider.metadata();

    if (
      metadata.id.trim().length === 0
    ) {
      throw new Error(
        "Provider ID must not be empty",
      );
    }

    if (
      metadata.name.trim().length === 0
    ) {
      throw new Error(
        `Provider "${metadata.id}" name must not be empty`,
      );
    }

    if (
      !Number.isFinite(
        metadata.priority,
      )
    ) {
      throw new Error(
        `Provider "${metadata.id}" priority must be a finite number`,
      );
    }

    if (
      providerIds.has(
        metadata.id,
      )
    ) {
      throw new Error(
        `Duplicate provider registration "${metadata.id}"`,
      );
    }

    providerIds.add(
      metadata.id,
    );
  }
}

export function bootstrapProviderOperations(
  duplicateDetectionService:
    DuplicateDetectionService,

  discoveryPersistenceService:
    DiscoveryPersistenceService,

  options:
    ProviderOperationsBootstrapOptions = {},
): ProviderOperationsBootstrapResult {
  const registrations =
    options.providers ?? [];

  if (
    options.requireProviders === true &&
    registrations.length === 0
  ) {
    throw new Error(
      "At least one provider registration is required",
    );
  }

  validateRegistrations(
    registrations,
  );

  const runtime =
    createProviderOperationsRuntime(
      duplicateDetectionService,
      discoveryPersistenceService,
      options.runtime,
    );

  if (
    registrations.length > 0
  ) {
    runtime.operations.registerMany(
      registrations,
    );
  }

  const registeredProviderIds =
    runtime.runtimeManager
      .list()
      .map(
        provider =>
          provider.metadata().id,
      );

  return {
    runtime,

    registeredProviderIds: [
      ...registeredProviderIds,
    ],

    registeredProviders:
      registeredProviderIds.length,
  };
}
