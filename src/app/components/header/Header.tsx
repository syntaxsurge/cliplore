"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeSwitch from "../buttons/ThemeSwitch";

export default function Header() {
  const pathname = usePathname();

  if (pathname.startsWith("/projects/")) {
    return null;
  }

  const marketingItems = [
    { href: "/", label: "Home" },
    { href: "/explore", label: "Explore IP" },
  ] as const;

  const appItems = [
    { href: "/projects", label: "Projects" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
  ] as const;

  const navItems = [...marketingItems, ...appItems] as const;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a
          href="#main"
          className="sr-only rounded-md px-2 py-1 text-sm text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:bg-background focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
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

        <nav className="flex items-center gap-2" aria-label="Primary">
          <ul className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <li key={item.href}>
                <Button
                  asChild
                  size="sm"
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  className="px-3"
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <div className="hidden md:block">
              <ConnectButton showBalance={false} />
            </div>
            <div className="md:hidden">
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus="avatar"
              />
            </div>

            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {marketingItems.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    asChild
                    className="cursor-pointer"
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {appItems.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    asChild
                    className="cursor-pointer"
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    </header>
  );
}
