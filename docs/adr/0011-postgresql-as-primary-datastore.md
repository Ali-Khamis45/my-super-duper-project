# ADR-0011 — PostgreSQL as the sole primary datastore (relational + JSONB + full-text search)

**Status**: Accepted

## Context

The domain needs real relational integrity (foreign keys between `Order`/`Payment`/`User`, unique constraints on `Email`, optimistic concurrency tokens), semi-structured data with no independent query requirements (`RecipeSelection`, mirroring the frontend's own `CustomizerSelection`/`RecipeSnapshot` denormalization — [30_COMMERCE_DDD_MODEL.md](../30_COMMERCE_DDD_MODEL.md)), and product/content search ([34_PAYMENTS_NOTIFICATIONS_SEARCH.md](../34_PAYMENTS_NOTIFICATIONS_SEARCH.md)). The alternatives considered: a document database (MongoDB) for flexibility, rejected because the domain's real relational integrity needs (an `Order` must reference a real `User`, a `Payment` must reference a real `Order`) are exactly what a document store gives up; a separate search engine (Elasticsearch) from day one, rejected as premature — no real current scale justifies its operational cost over PostgreSQL's own full-text search.

## Decision

PostgreSQL as the single primary datastore for every bounded context. Value objects with no independent query need (`RecipeSelection`) are stored as JSONB columns rather than decomposed into relational tables. Product/content search uses PostgreSQL's own `tsvector`/`tsquery`/`pg_trgm` rather than a dedicated search engine, behind an engine-agnostic `ISearchService` interface designed so a future Elasticsearch swap is a DI registration change ([29_COMMERCE_ARCHITECTURE_FREEZE.md](../29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 9).

## Consequences

Gains: one database to operate, back up, and reason about instead of two or three; JSONB gives document-database-like flexibility exactly where it's earned (denormalized snapshots) without giving up relational integrity everywhere else; genuinely free/open-source at any scale this project will reach, with mature managed-hosting options ([35_INFRASTRUCTURE_AND_DEPLOYMENT.md](../35_INFRASTRUCTURE_AND_DEPLOYMENT.md)). Costs, named honestly: PostgreSQL full-text search's relevance ranking is real but less sophisticated out of the box than a dedicated search engine's (C-08, [38_COMMERCE_RISK_REGISTER.md](../38_COMMERCE_RISK_REGISTER.md)) — accepted as a monitored trade-off with a real, designed escape hatch, not a permanent ceiling.
