import Link from "next/link";
import { saveContentTypeAction } from "@/app/admin/_actions/content-types";
import { ContentTypeForm } from "../_components/content-type-form";

export default function NewContentTypePage() {
  return (
    <>
      <h2>New content type</h2>
      <p className="lead">
        <Link href="/admin/content-types">← Back to content types</Link>
      </p>
      <ContentTypeForm action={saveContentTypeAction} />
    </>
  );
}