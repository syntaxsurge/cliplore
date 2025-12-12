"use client";

import { useRouter } from "next/navigation";
import SidebarButton from "./SidebarButton";
import { Home } from "lucide-react";

export default function HomeButton() {
  const router = useRouter();

  return (
    <SidebarButton
      label="Home"
      icon={<Home className="h-6 w-6" />}
      onClick={() => router.push("/")}
    />
  );
}
