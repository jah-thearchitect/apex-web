import { DocEditor } from "@/components/admin/DocEditor";
import { editorContext } from "@/lib/adminDocs";

export const dynamic = "force-dynamic";
export const metadata = { title: "New quote" };

export default async function NewQuote({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const ctx = await editorContext((await searchParams).client ?? "");
  return <DocEditor type="quote" {...ctx} />;
}
