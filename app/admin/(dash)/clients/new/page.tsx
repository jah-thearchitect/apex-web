import Link from "next/link";
import { ClientForm } from "@/components/admin/ClientForm";

export const metadata = { title: "New client" };

export default function NewClient() {
  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/clients" className="admin-back">&larr; All clients</Link>
          <h1>New client</h1>
        </div>
      </div>
      <ClientForm />
    </>
  );
}
