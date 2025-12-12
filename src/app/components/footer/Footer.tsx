"use client";

import { usePathname } from "next/navigation";
import { Github, Instagram, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();

  if (pathname.startsWith("/projects/")) {
    return null;
  }

  return (
    <footer className="border-t border-border bg-background/80 text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:px-6 lg:px-8">
        <p>&copy; {currentYear} Cliplore. All rights reserved.</p>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="LinkedIn">
            <a
              href="https://www.linkedin.com/company/story-protocol/"
              target="_blank"
              rel="noreferrer"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Instagram">
            <a
              href="https://www.instagram.com/storyprotocol"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="X (Twitter)">
            <a
              href="https://x.com/StoryProtocol"
              target="_blank"
              rel="noreferrer"
            >
              <Twitter className="h-5 w-5" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="GitHub">
            <a
              href="https://github.com/storyprotocol"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
