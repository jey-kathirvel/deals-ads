import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/*
 * Deals.ai database schema
 *
 * Discovery remains independent of Amazon and Flipkart affiliate APIs.
 * Amazon partner tags are applied only when generating outbound redirects.
 */

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),

    emailVerifiedAt: integer("email_verified_at", {
      mode: "timestamp",
    }),

    status: text("status", {
      enum: ["ACTIVE", "SUSPENDED", "DELETED"],
    })
      .notNull()
      .default("ACTIVE"),

    createdAt: integer("created_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_status_idx").on(table.status),
  ],
);

export const dealCategories = sqliteTable(
  "deal_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),

    description: text("description"),
    icon: text("icon"),

    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    createdAt: integer("created_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("deal_categories_name_unique").on(table.name),
    uniqueIndex("deal_categories_slug_unique").on(table.slug),
    index("deal_categories_active_sort_idx").on(
      table.isActive,
      table.sortOrder,
    ),
  ],
);

export const deals = sqliteTable(
  "deals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    externalId: text("external_id"),
    sourceFingerprint: text("source_fingerprint").notNull(),

    platform: text("platform").notNull(),
    merchantName: text("merchant_name").notNull(),

    categoryId: integer("category_id").references(
      () => dealCategories.id,
      {
        onDelete: "set null",
      },
    ),

    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),

    imageUrl: text("image_url"),

    originalUrl: text("original_url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    redirectUrl: text("redirect_url").notNull(),

    currentPrice: real("current_price").notNull(),
    originalPrice: real("original_price"),
    discountPercent: real("discount_percent"),

    currency: text("currency").notNull().default("INR"),

    rating: real("rating"),
    reviewCount: integer("review_count"),

    status: text("status", {
      enum: ["ACTIVE", "EXPIRING", "EXPIRED", "ARCHIVED"],
    })
      .notNull()
      .default("ACTIVE"),

    qualityScore: integer("quality_score").notNull().default(0),

    discoveryDate: text("discovery_date").notNull(),

    discoveredAt: integer("discovered_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),

    publishedAt: integer("published_at", {
      mode: "timestamp",
    }),

    expiresAt: integer("expires_at", {
      mode: "timestamp",
    }),

    expiredAt: integer("expired_at", {
      mode: "timestamp",
    }),

    archivedAt: integer("archived_at", {
      mode: "timestamp",
    }),

    metadataJson: text("metadata_json"),

    createdAt: integer("created_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("deals_source_fingerprint_unique").on(
      table.sourceFingerprint,
    ),

    uniqueIndex("deals_slug_unique").on(table.slug),

    index("deals_status_idx").on(table.status),

    index("deals_discovery_date_status_idx").on(
      table.discoveryDate,
      table.status,
    ),

    index("deals_category_status_idx").on(
      table.categoryId,
      table.status,
    ),

    index("deals_platform_status_idx").on(
      table.platform,
      table.status,
    ),

    index("deals_expires_at_idx").on(table.expiresAt),

    index("deals_quality_score_idx").on(table.qualityScore),
  ],
);

export const coupons = sqliteTable(
  "coupons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    sourceFingerprint: text("source_fingerprint").notNull(),

    platform: text("platform").notNull(),
    merchantName: text("merchant_name").notNull(),

    categoryId: integer("category_id").references(
      () => dealCategories.id,
      {
        onDelete: "set null",
      },
    ),

    title: text("title").notNull(),
    description: text("description"),

    couponCode: text("coupon_code"),

    imageUrl: text("image_url"),

    originalUrl: text("original_url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    redirectUrl: text("redirect_url").notNull(),

    status: text("status", {
      enum: ["ACTIVE", "EXPIRING", "EXPIRED", "ARCHIVED"],
    })
      .notNull()
      .default("ACTIVE"),

    qualityScore: integer("quality_score").notNull().default(0),

    discoveryDate: text("discovery_date").notNull(),

    discoveredAt: integer("discovered_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),

    publishedAt: integer("published_at", {
      mode: "timestamp",
    }),

    expiresAt: integer("expires_at", {
      mode: "timestamp",
    }),

    expiredAt: integer("expired_at", {
      mode: "timestamp",
    }),

    archivedAt: integer("archived_at", {
      mode: "timestamp",
    }),

    metadataJson: text("metadata_json"),

    createdAt: integer("created_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("coupons_source_fingerprint_unique").on(
      table.sourceFingerprint,
    ),

    index("coupons_discovery_date_status_idx").on(
      table.discoveryDate,
      table.status,
    ),

    index("coupons_category_status_idx").on(
      table.categoryId,
      table.status,
    ),

    index("coupons_platform_code_idx").on(
      table.platform,
      table.couponCode,
    ),

    index("coupons_expires_at_idx").on(table.expiresAt),
  ],
);

export const savedDeals = sqliteTable(
  "saved_deals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    dealId: integer("deal_id")
      .notNull()
      .references(() => deals.id, {
        onDelete: "restrict",
      }),

    notifyBeforeExpiry: integer("notify_before_expiry", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    expiryNotifiedAt: integer("expiry_notified_at", {
      mode: "timestamp",
    }),

    expiredNotifiedAt: integer("expired_notified_at", {
      mode: "timestamp",
    }),

    savedAt: integer("saved_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("saved_deals_user_deal_unique").on(
      table.userId,
      table.dealId,
    ),

    index("saved_deals_user_idx").on(table.userId),
    index("saved_deals_deal_idx").on(table.dealId),
  ],
);

export const savedCoupons = sqliteTable(
  "saved_coupons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    couponId: integer("coupon_id")
      .notNull()
      .references(() => coupons.id, {
        onDelete: "restrict",
      }),

    notifyBeforeExpiry: integer("notify_before_expiry", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    expiryNotifiedAt: integer("expiry_notified_at", {
      mode: "timestamp",
    }),

    expiredNotifiedAt: integer("expired_notified_at", {
      mode: "timestamp",
    }),

    savedAt: integer("saved_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("saved_coupons_user_coupon_unique").on(
      table.userId,
      table.couponId,
    ),

    index("saved_coupons_user_idx").on(table.userId),
    index("saved_coupons_coupon_idx").on(table.couponId),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    dealId: integer("deal_id").references(() => deals.id, {
      onDelete: "set null",
    }),

    couponId: integer("coupon_id").references(() => coupons.id, {
      onDelete: "set null",
    }),

    type: text("type", {
      enum: [
        "DEAL_EXPIRING",
        "DEAL_EXPIRED",
        "COUPON_EXPIRING",
        "COUPON_EXPIRED",
        "SIMILAR_DEAL",
        "SYSTEM",
      ],
    }).notNull(),

    title: text("title").notNull(),
    message: text("message").notNull(),

    channel: text("channel", {
      enum: ["IN_APP", "EMAIL", "PUSH", "WHATSAPP"],
    })
      .notNull()
      .default("IN_APP"),

    status: text("status", {
      enum: ["PENDING", "SENT", "FAILED", "READ"],
    })
      .notNull()
      .default("PENDING"),

    sentAt: integer("sent_at", {
      mode: "timestamp",
    }),

    readAt: integer("read_at", {
      mode: "timestamp",
    }),

    createdAt: integer("created_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("notifications_user_status_idx").on(
      table.userId,
      table.status,
    ),

    index("notifications_created_at_idx").on(table.createdAt),
  ],
);

export const userPreferences = sqliteTable(
  "user_preferences",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    emailNotifications: integer("email_notifications", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    inAppNotifications: integer("in_app_notifications", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    expiryAlerts: integer("expiry_alerts", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    expiryAlertHours: integer("expiry_alert_hours")
      .notNull()
      .default(6),

    preferredCategoriesJson: text(
      "preferred_categories_json",
    ),

    createdAt: integer("created_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_preferences_user_unique").on(table.userId),
  ],
);

export const discoveryProviders = sqliteTable(
  "discovery_providers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    providerKey: text("provider_key").notNull(),
    name: text("name").notNull(),

    enabled: integer("enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    sourceType: text("source_type", {
      enum: [
        "PUBLIC_FEED",
        "MERCHANT_FEED",
        "STRUCTURED_SOURCE",
        "MANUAL",
      ],
    }).notNull(),

    healthStatus: text("health_status", {
      enum: ["HEALTHY", "DEGRADED", "DOWN", "UNKNOWN"],
    })
      .notNull()
      .default("UNKNOWN"),

    lastSuccessAt: integer("last_success_at", {
      mode: "timestamp",
    }),

    lastFailureAt: integer("last_failure_at", {
      mode: "timestamp",
    }),

    lastError: text("last_error"),

    createdAt: integer("created_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("discovery_providers_key_unique").on(
      table.providerKey,
    ),

    index("discovery_providers_enabled_idx").on(table.enabled),
  ],
);

export const discoveryRuns = sqliteTable(
  "discovery_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    runKey: text("run_key").notNull(),

    triggerType: text("trigger_type", {
      enum: ["CRON", "MANUAL", "RETRY"],
    }).notNull(),

    status: text("status", {
      enum: ["RUNNING", "COMPLETED", "PARTIAL", "FAILED"],
    })
      .notNull()
      .default("RUNNING"),

    providersAttempted: integer("providers_attempted")
      .notNull()
      .default(0),

    providersSucceeded: integer("providers_succeeded")
      .notNull()
      .default(0),

    dealsDiscovered: integer("deals_discovered")
      .notNull()
      .default(0),

    couponsDiscovered: integer("coupons_discovered")
      .notNull()
      .default(0),

    dealsPublished: integer("deals_published")
      .notNull()
      .default(0),

    couponsPublished: integer("coupons_published")
      .notNull()
      .default(0),

    duplicatesRejected: integer("duplicates_rejected")
      .notNull()
      .default(0),

    invalidRejected: integer("invalid_rejected")
      .notNull()
      .default(0),

    errorMessage: text("error_message"),

    startedAt: integer("started_at", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),

    completedAt: integer("completed_at", {
      mode: "timestamp",
    }),
  },
  (table) => [
    uniqueIndex("discovery_runs_run_key_unique").on(table.runKey),

    index("discovery_runs_status_started_idx").on(
      table.status,
      table.startedAt,
    ),
  ],
);
