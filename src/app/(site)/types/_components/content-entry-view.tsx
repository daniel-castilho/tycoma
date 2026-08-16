import Image from "next/image";
import type { ContentType, ContentTypeField } from "@/modules/content/domain/content-types";
import type { MediaAsset } from "@/modules/media/domain/types";
import { formatDate } from "../../_lib/format";

export function ContentEntryFields({
  fields,
  contentType,
  timezone,
  mediaFields,
}: {
  fields: Record<string, unknown>;
  contentType: ContentType;
  timezone: string;
  mediaFields: Map<string, MediaAsset | null>;
}) {
  return (
    <dl className="site-entry-fields">
      {contentType.fields.map((field) => {
        const raw = fields[field.name];
        return (
          <div key={field.name} className="site-entry-field">
            <dt>{field.label}</dt>
            <dd>
              <ContentFieldValue
                field={field}
                value={raw}
                timezone={timezone}
                media={field.type === "media" ? mediaFields.get(field.name) ?? null : null}
              />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ContentFieldValue({
  field,
  value,
  timezone,
  media,
}: {
  field: ContentTypeField;
  value: unknown;
  timezone: string;
  media: MediaAsset | null;
}) {
  if (field.type === "media") {
    if (!media) return <em className="site-empty site-media-unavailable">Mídia indisponível</em>;
    return (
      <Image
        src={media.url}
        alt={media.alt ?? media.filename}
        width={800}
        height={450}
        unoptimized
        style={{ height: "auto", maxWidth: "100%" }}
      />
    );
  }
  if (value === undefined || value === null || value === "") return <em className="site-empty">—</em>;
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "date") {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : formatDate(date, timezone);
  }
  if (field.type === "longtext") return <pre className="site-article-body">{String(value)}</pre>;
  return String(value);
}
