import type { ContentType, ContentTypeField } from "@/modules/content/domain/content-types";
import { formatDate } from "../../_lib/format";

export function ContentEntryFields({
  fields,
  contentType,
  timezone,
}: {
  fields: Record<string, unknown>;
  contentType: ContentType;
  timezone: string;
}) {
  return (
    <dl className="site-entry-fields">
      {contentType.fields.map((field) => {
        const raw = fields[field.name];
        return (
          <div key={field.name} className="site-entry-field">
            <dt>{field.label}</dt>
            <dd>
              <ContentFieldValue field={field} value={raw} timezone={timezone} />
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
}: {
  field: ContentTypeField;
  value: unknown;
  timezone: string;
}) {
  if (value === undefined || value === null || value === "") return <em className="site-empty">—</em>;
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "date") {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : formatDate(date, timezone);
  }
  if (field.type === "longtext") return <pre className="site-article-body">{String(value)}</pre>;
  return String(value);
}
