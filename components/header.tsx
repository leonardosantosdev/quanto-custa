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
          <Link href="/graham">Graham</Link>
          <Link href="/bazin">Bazin</Link>
          <Link href="/juros-compostos">Juros</Link>
          <Link href="/renda-fixa">Renda fixa</Link>
          <Link href="/independencia-financeira">Independência</Link>
          <Link href="/metodologia">Metodologia</Link>
          <Link className="mobile-tools-link" href="/#ferramentas">Ferramentas</Link>
        </nav>
      </div>
    </header>
  );
}
