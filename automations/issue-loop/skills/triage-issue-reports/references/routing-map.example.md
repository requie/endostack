# Routing map (example)

Copy this outside the pack (for example `.issue-loop/routing.yaml`), replace the placeholders, and set `routing.map_path` in the config. Triage reads it only to decide where a report belongs and whether one owner mention is allowed.

```yaml
routes:
  - name: sync-engine
    match:
      areas: [offline sync, conflict resolution]
      code_paths: [src/sync/]
      signatures: ["SyncConflictError", "E_SYNC_"]
    destination:
      tracker_team: SYNC
      issue_repo: acme/notebook-sync     # tell the reporter to file here
    owners: ["@sync-owner-handle"]
    feature_owner_pings: false

  - name: billing
    match:
      areas: [subscriptions, invoices]
      code_paths: [services/billing/]
      signatures: ["StripeCardError"]
    destination:
      tracker_team: BILL
      issue_repo: ""
    owners: []
    feature_owner_pings: false

fallback:
  destination: { tracker_team: "", issue_repo: "" }
  owners: []

ping_policy:
  default: off
  allowed: [configured_feature_owner, confirmed_regression_author]
  denied: [on_call_groups, unverified_owners]
```

Rules: leave the fallback empty unless one team agreed to take everything unmatched. Match on stable keys (code paths, error names), never on words a reporter might type. A keyword match alone never justifies a route. Keep `feature_owner_pings` off until that team agrees. Do not put private data or raw user IDs in a copy that will be committed to a public repository. When triage reroutes a report, its reply points the reporter at the right destination, and triage itself posts nothing in that other place.
