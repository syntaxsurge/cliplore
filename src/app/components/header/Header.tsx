"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import ThemeSwitch from "../buttons/ThemeSwitch";

export default function Header() {
  const pathname = usePathname();

  if (pathname.startsWith("/projects/")) {
    return null;
  }

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/explore", label: "Explore IP" },
    { href: "/about", label: "About" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-foreground hover:opacity-90"
        >
          <Image
            src="/images/cliplore-logo.png"
            alt="Cliplore logo"
            width={40}
            height={40}
            priority
            className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
            sizes="(max-width: 640px) 32px, 40px"
          />
          <span className="text-xl sm:text-2xl font-semibold tracking-tight">
            Cliplore
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <ul className="flex flex-wrap items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Button
                    asChild
                    size="sm"
                    variant={isActive ? "secondary" : "ghost"}
                    className="px-3"
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2 pl-2">
            <ThemeSwitch />
            <ConnectButton showBalance={false} />
          </div>
        </nav>
      </div>
    </header>
  );
}
