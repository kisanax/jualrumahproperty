import Link from "next/link";
import { auth } from "@/auth";
import BrandLogo from "./BrandLogo";
import AccountDropdown from "./AccountDropdown";
import SmartHeader from "./SmartHeader";
import PortalSubnav from "./PortalSubnav";
import CompactSearchPill from "./CompactSearchPill";

interface PortalHeaderProps {
  activeType?: string;
  initialArea?: string;
  initialBudget?: string;
  initialAreaName?: string;
  initialQuery?: string;
  initialKawasan?: string;
  initialCity?: string;
}

const TYPE_NAMES: Record<string, string> = {
  HOUSE: "Rumah",
  APARTMENT: "Apartemen",
  LAND: "Tanah",
  SHOPHOUSE: "Ruko",
};

const BUDGET_NAMES: Record<string, string> = {
  under5: "< Rp5 M",
  "5to10": "Rp5–10 M",
  "10to25": "Rp10–25 M",
  above25: "> Rp25 M",
};

export default async function PortalHeader({
  activeType = "",
  initialArea = "",
  initialBudget = "",
  initialAreaName = "",
  initialQuery = "",
  initialKawasan = "",
  initialCity = "",
}: PortalHeaderProps) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const user = session?.user;
  const accountHref = user?.platformRole === "MEMBER" ? "/akun" : "/admin";
  const accountLabel = user?.platformRole === "MEMBER" ? "Akun Saya" : "Mode Agen";

  const currentTypeLabel = TYPE_NAMES[activeType] || "Semua Jenis";
  const currentBudgetLabel = BUDGET_NAMES[initialBudget] || "Semua Harga";
  const currentAreaLabel = initialAreaName || initialQuery || (initialArea ? "Area Terpilih" : "Semua Lokasi");

  const accountDropdown = (
    <AccountDropdown
      userName={user?.name ?? null}
      userEmail={user?.email ?? null}
      userImage={user?.image ?? null}
      platformRole={user?.platformRole ?? null}
      isLoggedIn={isLoggedIn}
    />
  );

  const phoneLink = (
    <a
      className="mobile-call"
      href="tel:+6281234567890"
      aria-label="Telepon Jual Rumah Property"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.1 3.8 9 3.3c.5-.1 1 .2 1.2.7l1 2.6c.2.5 0 1-.4 1.3L9.4 9c.9 2 2.6 3.7 4.6 4.6l1.1-1.4c.3-.4.9-.6 1.3-.4l2.6 1c.5.2.8.7.7 1.2l-.5 1.9c-.2 1-1.1 1.7-2.1 1.7A12.7 12.7 0 0 1 4.4 4.9c0-1 .7-1.9 1.7-2.1Z" />
      </svg>
    </a>
  );

  return (
    <SmartHeader
      logoSlot={
        <BrandLogo />
      }
      compactSearchSlot={
        <CompactSearchPill
          areaLabel={currentAreaLabel}
          typeLabel={currentTypeLabel}
          budgetLabel={currentBudgetLabel}
        />
      }
      searchSlot={
        <PortalSubnav
          activeType={activeType}
          initialArea={initialArea}
          initialBudget={initialBudget}
          initialQuery={initialQuery}
          initialKawasan={initialKawasan}
          initialCity={initialCity}
        />
      }
      navSlot={
        <>
          <nav className="desktop-nav" aria-label="Navigasi utama">
            <Link href="/favorit" className="nav-fav-link">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
              </svg>
              Favorit Saya
            </Link>
            <Link
              href={isLoggedIn ? accountHref : "/daftar-broker"}
              className="nav-agent-btn"
            >
              {isLoggedIn ? accountLabel : "Jadi Agen"}
            </Link>

            {accountDropdown}
          </nav>
        </>
      }
      mobileNavSlot={<>{accountDropdown}{phoneLink}</>}
    />
  );
}
