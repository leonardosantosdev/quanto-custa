import Link from "next/link";

import { SITE_CONFIG } from "@/lib/config";

export function Header() {
  return (
    <header className="site-header">
      <div className="page-shell header-inner">
        <Link className="brand" href="/" aria-label={`${SITE_CONFIG.name}, início`}>
          <span className="brand-mark" aria-hidden="true" />
          {SITE_CONFIG.name}
        </Link>
        <nav className="main-nav" aria-label="Navegação principal">
          <Link href="/">Graham</Link>
          <Link href="/bazin">Bazin</Link>
          <Link href="/metodologia">Metodologia</Link>
          <Link className="nav-action" href="/#calcular">
            Calcular
          </Link>
        </nav>
      </div>
    </header>
  );
}
