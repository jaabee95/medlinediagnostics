# Architecture rules
- Billing monetary writes use authenticated, permission-checked PostgreSQL RPC transactions; this prevents partial invoice saves and concurrent overpayments.
- Billing keeps catalogue name and price snapshots on invoice items so historical bills are independent of catalogue edits.
- Billing lives beneath the existing AdminShell without replacing auth, deployment, or router configuration.