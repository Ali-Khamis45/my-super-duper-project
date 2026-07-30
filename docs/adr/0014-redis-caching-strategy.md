# ADR-0014 — One shared Redis instance, five usages separated by key prefix

**Status**: Accepted

## Context

Five distinct concerns each want a fast, shared, in-memory store: catalog/content read-through caching, rate-limiting counters, inventory reservation holds, search autocomplete, and SignalR's multi-replica scale-out backplane ([35_INFRASTRUCTURE_AND_DEPLOYMENT.md](../35_INFRASTRUCTURE_AND_DEPLOYMENT.md)). The alternative considered was a separate Redis instance per concern, which cleanly isolates failure domains (a cache outage wouldn't also break rate limiting) but multiplies operational cost (five managed instances instead of one) for a project at Milestone 5's real current scale, where no single usage's load justifies dedicated infrastructure yet.

## Decision

One managed Redis instance, five usages separated by key prefix (`cache:`, `ratelimit:`, `reserve:`, `search:`, `session:` for the SignalR backplane) so a future decision to split any one usage onto its own instance is a configuration change, not a redesign. Each usage's failure mode is independently specified rather than assuming Redis itself never fails: rate limiting fails closed (rejects rather than allows unlimited traffic), caching degrades to a direct database read, inventory reservation loss is bounded by `StockQuantity`'s own never-negative invariant as a backstop.

## Consequences

Gains: one piece of infrastructure to provision, monitor, and pay for instead of five; the prefix convention means the eventual "split usage X onto its own instance" migration (if real load ever demands it) touches only that usage's connection configuration, not its calling code. Costs, named honestly: a single Redis outage now affects five concerns simultaneously rather than one (C-15, [38_COMMERCE_RISK_REGISTER.md](../38_COMMERCE_RISK_REGISTER.md)) — accepted because each usage's independent degradation design means "Redis is down" is survivable (checkout blocks, cache falls back to DB, rate limiting fails closed) rather than catastrophic, and a managed Redis instance's real uptime SLA makes this an acceptable trade for avoiding five instances' worth of operational overhead at current scale.
