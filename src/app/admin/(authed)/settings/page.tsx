import { content } from "@/app/_lib/modules";
import { saveSettingsAction } from "@/app/admin/_actions/settings";
import { SelectField, TextArea, TextField } from "@/app/admin/(authed)/_components/form-field";
import { SubmitButton } from "@/app/admin/(authed)/_components/submit-button";

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export default async function SettingsPage() {
  const settings = await content.getSettings();

  return (
    <>
      <h2>Settings</h2>
      <p className="lead">Site-wide configuration used by the public site and the CMS.</p>

      <form action={saveSettingsAction} className="form-stack" style={{ maxWidth: "36rem", gap: "1rem" }}>
        <TextField label="Site title" name="title" defaultValue={settings.title} />
        <TextArea label="Site description" name="description" defaultValue={settings.description} rows={2} />
        <TextField label="Base URL" name="baseUrl" defaultValue={settings.baseUrl} hint="e.g. https://example.com — used for links and the sitemap." />
        <SelectField label="Timezone" name="timezone" defaultValue={settings.timezone}>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </SelectField>
        <TextField label="Logo media ID" name="logoMediaId" defaultValue={settings.logoMediaId ?? ""} hint="Optional media asset ID shown in the site header." />
        <TextField label="Favicon media ID" name="faviconMediaId" defaultValue={settings.faviconMediaId ?? ""} hint="Optional media asset ID used as the browser favicon." />
        <SubmitButton label="Save settings" />
      </form>
    </>
  );
}