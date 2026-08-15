# Lessons

Durable rules learned the hard way. Add an entry whenever a decision is made that should never be
silently reversed.

## Prisma 7 has no MongoDB support — stay pinned on Prisma 6.x

Prisma ORM 7 (released Nov 2025) moved to a driver-adapter architecture and **dropped MongoDB**:
no `@prisma/adapter-mongodb` package exists and all v7 adapters target SQL databases. A Prisma 7
scaffold fails at `prisma generate` with `P1012` ("datasource property `url` is no longer
supported") and cannot be made to work with MongoDB.

Rule: keep `prisma` and `@prisma/client` pinned to **6.x** (currently `6.19.3`) until Prisma
officially ships MongoDB support for v7. Do **not** bump to 7 on a whim — verify MongoDB support in
the release notes first.