import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccountAccess } from "@/lib/broker-workspace-access";
import { getAccessibleModules } from "@/lib/module-access";
import AdminShell from "./AdminShell";
import PWARegister from "./PWARegister";
import "./admin.css";
import "@/components/admin-ui/admin-ui.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Jual Rumah Property",
  description: "Panel internal Jual Rumah Property",
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JRP Admin",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccountAccess();
  if (access.kind === "unauthenticated") redirect("/login");
  if (access.kind === "member") redirect("/akun");
  if (access.kind === "broker-incomplete" || access.kind === "broker-revision") redirect("/onboarding");
  if (access.kind === "broker-pending" || access.kind === "broker-rejected" || access.kind === "broker-suspended") redirect("/onboarding/status");

  const accessible = await getAccessibleModules(prisma, access.user.platformRole);

  return (
    <>
      <Script
        id="admin-theme-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            try {
              var t = localStorage.getItem('admin-theme');
              var theme = (t === 'light' || t === 'dark') ? t : 'light';
              document.documentElement.setAttribute('data-theme', theme);
              if (document.body) document.body.setAttribute('data-theme', theme);
            } catch(e) {}
          `,
        }}
      />
      <div className="admin-layout" style={{ fontFamily: "var(--font-admin)" }} suppressHydrationWarning>
        <AdminShell
          platformRole={access.user.platformRole}
          userName={access.user.name}
          userEmail={access.user.email}
          accessibleModules={[...accessible]}
        >
          {children}
        </AdminShell>
        <PWARegister />
      </div>
    </>
  );
}
