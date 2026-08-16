# Content Types — Module Spec

## Data model (Prisma / MongoDB)

```prisma
model ContentType {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  slug        String   @unique
  description String?
  fields      Json     // ContentTypeField[] serialized
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ContentEntry {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  contentTypeId String   @db.ObjectId
  slug          String
  title         String
  status        String
  fields        Json     // { [fieldName]: value }
  publishedAt   DateTime?
  scheduledAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([contentTypeId, slug])
}
```

## Domain

```ts
type ContentFieldType = "text" | "longtext" | "number" | "boolean" | "date";
type ContentTypeField = { name: string; label: string; type: ContentFieldType; required: boolean };
type ContentType = { id; name; slug; description: string | null; fields: ContentTypeField[]; createdAt; updatedAt };
type ContentEntry = { id; contentTypeId; slug; title; status: ContentStatus; fields: Record<string, unknown>; publishedAt: Date | null; scheduledAt: Date | null; createdAt; updatedAt };
type ContentEntryWrite = Omit<ContentEntry, "id" | "createdAt" | "updatedAt">;
```

Ports (Reader/Writer split):
- `ContentTypeRepository`: `list()`, `findById(id)`, `findBySlug(slug)`, `create(data)`, `update(id, data)`, `delete(id)`, `countEntries(contentTypeId)`
- `ContentEntryRepository`: `list(query: { contentTypeId, status?, search? })`, `findById(id)`, `findBySlug(contentTypeId, slug)`, `create(data)`, `update(id, data)`, `delete(id)`

Validation (`validateEntryFields`): every required field present; `text`/`longtext` → string; `number` → finite number; `boolean` → boolean; `date` → valid Date. Unknown fields dropped.

## Public routing

- `/types/[type]` — published entries index for the type (newest published first)
- `/types/[type]/[slug]` — published entry detail; `notFound()` if missing/unpublished

Reserved segment `types` takes precedence over page `[slug]` (documented shadowing rule in the public-site spec).