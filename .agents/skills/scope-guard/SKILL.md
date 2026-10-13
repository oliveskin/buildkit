---
name: scope-guard
description: Use whenever implementing or planning an LLD block to prevent PRD/HLD/LLD drift.
---

## Steps
1. Read the requested block and link its PRD IDs, API contracts and acceptance criteria.
2. Check each proposed edit against scope; list changes outside the block and refuse to silently include them.
3. Check HLD topology/API/data storage unchanged, unless documented and approved.
4. At end, enumerate which acceptance criteria have **actual evidence** and which remain unverified.
5. Update `docs/STATUS.md` with distinct built/reviewed/merged/deployed/verified states.
