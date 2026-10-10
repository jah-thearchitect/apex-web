import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PageShell({ children, showHome = true }: { children: React.ReactNode; showHome?: boolean }) {
  return (
    <>
      <SiteHeader showHome={showHome} />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
