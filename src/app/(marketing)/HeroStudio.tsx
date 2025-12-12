"use client";

import { useCallback, useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

export function HeroStudio() {
  const reduceMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const shouldReduceMotion = hydrated ? reduceMotion : false;
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const smx = useSpring(mx, { stiffness: 120, damping: 18, mass: 0.5 });
  const smy = useSpring(my, { stiffness: 120, damping: 18, mass: 0.5 });

  const rotateX = useTransform(smy, [-140, 140], [8, -8]);
  const rotateY = useTransform(smx, [-140, 140], [-10, 10]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (shouldReduceMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      mx.set(x);
      my.set(y);
    },
    [mx, my, shouldReduceMotion],
  );

  const onPointerLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      role="presentation"
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 opacity-60"
        animate={
          shouldReduceMotion
            ? undefined
            : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(99,102,241,.32), transparent 50%)," +
            "radial-gradient(circle at 85% 25%, rgba(236,72,153,.22), transparent 55%)," +
            "radial-gradient(circle at 35% 85%, rgba(34,197,94,.16), transparent 55%)",
          backgroundSize: "200% 200%",
        }}
      />

      <div className="relative p-5 sm:p-7">
        <motion.div
          className="relative rounded-2xl border border-border/70 bg-background/70 shadow-xl backdrop-blur"
          style={
            shouldReduceMotion
              ? undefined
              : { rotateX, rotateY, transformStyle: "preserve-3d" }
          }
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Cliplore Studio
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full border border-border bg-muted px-2 py-1">
                Sora
              </span>
              <span className="rounded-full border border-border bg-muted px-2 py-1">
                Story
              </span>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted/40">
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.25),transparent_55%)]"
                animate={
                  shouldReduceMotion ? undefined : { opacity: [0.45, 0.7, 0.45] }
                }
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.div
                className="absolute left-3 top-3 rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur"
                animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              >
                Prompt → Clip → Timeline
              </motion.div>

              <motion.div
                className="absolute right-3 bottom-3 rounded-2xl border border-border bg-background/80 px-3 py-2 text-[11px] font-medium text-foreground shadow-sm backdrop-blur"
                animate={shouldReduceMotion ? undefined : { y: [0, -7, 0] }}
                transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
              >
                ✅ Registered IP Asset
              </motion.div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Timeline</span>
                <span>Export → Publish</span>
              </div>
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                <div className="h-3 w-full rounded bg-muted" />
                <motion.div
                  className="h-3 w-[78%] rounded bg-muted"
                  animate={shouldReduceMotion ? undefined : { x: [0, 18, 0] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div className="h-3 w-[62%] rounded bg-muted" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
