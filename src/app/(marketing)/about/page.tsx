import { Github, Heart, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Card>
        <CardHeader className="text-center space-y-3">
          <CardTitle className="text-3xl sm:text-4xl">
            Hey there, we’re building Cliplore
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Cliplore is an IP‑native studio for Sora‑powered video creation,
            editing, and licensing on Story Protocol.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            We combine a browser‑first editor with on‑chain IP registration so
            every prompt, script, and final cut can be monetized safely.
          </p>
          <p>
            Everything, including rendering, happens in the browser. No
            watermarks, no installs—just fast editing plus programmable IP
            licensing.
          </p>

          <div className="flex justify-center gap-2 pt-2">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Story Protocol GitHub"
            >
              <a
                href="https://github.com/storyprotocol"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Story Protocol Twitter"
            >
              <a
                href="https://twitter.com/StoryProtocol"
                target="_blank"
                rel="noreferrer"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button asChild size="lg">
            <a
              href="https://storyprotocol.xyz"
              target="_blank"
              rel="noreferrer"
            >
              <Heart className="h-4 w-4" />
              Learn about Story Protocol
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
