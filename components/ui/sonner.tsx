"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

// Single source of truth for the app-wide toast surface.
// The app is dark-only, so we hardcode `theme="dark"` instead of routing through
// next-themes — avoids a needless context lookup on every render.
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    richColors
    closeButton
    expand={false}
    visibleToasts={4}
    gap={10}
    offset={20}
    duration={5000}
    className="toaster group"
    toastOptions={{
      // Glass surface that matches the panels — semi-opaque, blurred, subtle border.
      // `data-[type=...]` selectors let `richColors` paint the icon/border accent
      // while we keep our own background.
      classNames: {
        toast: [
          "group toast",
          "rounded-xl border bg-zinc-950/85 backdrop-blur-xl backdrop-saturate-150",
          "border-zinc-800/60 text-zinc-100",
          "shadow-[0_18px_50px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]",
          "data-[type=error]:border-red-500/40",
          "data-[type=success]:border-emerald-500/40",
          "data-[type=warning]:border-amber-500/40",
          "data-[type=info]:border-sky-500/40",
        ].join(" "),
        title: "text-sm font-semibold",
        description: "text-xs text-zinc-400 leading-relaxed",
        actionButton:
          "rounded-md bg-white/10 hover:bg-white/15 text-zinc-100 text-xs font-medium px-2.5 py-1 border border-white/10 transition-colors",
        cancelButton:
          "rounded-md bg-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200 text-xs px-2.5 py-1 transition-colors",
        closeButton:
          "bg-zinc-900/90 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors",
      },
    }}
    {...props}
  />
)

export { Toaster }
