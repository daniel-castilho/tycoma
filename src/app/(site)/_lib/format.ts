export function formatDate(date: Date | null | undefined, timezone = "UTC"): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: timezone }).format(date);
}

export function excerpt(body: string, limit = 220): string {
  const text = body.replace(/[#*_`>]/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}

export function resolveBaseUrl(baseUrl: string): string {
  return (baseUrl || "http://localhost:3000").replace(/\/$/, "");
}