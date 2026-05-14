/**
 * Welcome — first-visit landing splash.
 *
 * Drops in front of the dispatch console on first visit. Marketing surface
 * for the public web demo at operator-sim.vercel.app. Users hit PLAY DEMO
 * to set localStorage and continue into the live shift. Steam wishlist
 * URL is a placeholder until Phase 4 (appid provisioned).
 *
 * Design: Foundry / Palantir-grade. No marketing fluff. Single column,
 * dense mono kicker, large serif-free title, three-tile feature grid,
 * single CTA pair. Tokens from src/index.css — no inline hex.
 */
import { useEffect, useState } from "react";

const STORAGE_KEY = "operator_sim_welcomed_v1";

// Placeholder until Steam appid lands. Kruz updates this string + redeploys.
const STEAM_WISHLIST_URL = "https://store.steampowered.com/search/?term=operator+sim";

export function shouldShowWelcome(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function dismissWelcome(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

interface WelcomeProps {
  onEnter: () => void;
}

export function Welcome({ onEnter }: WelcomeProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Small mount delay so the fade-in reads as deliberate, not instant.
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handlePlay = () => {
    dismissWelcome();
    onEnter();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "var(--color-bg-base)",
        opacity: mounted ? 1 : 0,
        transition: "opacity 220ms ease-out",
      }}
    >
      {/* hairline grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-subtle) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.18,
        }}
      />

      <div
        className="relative max-w-[920px] w-full px-12 py-10 grid gap-8"
        style={{
          background: "var(--color-bg-panel)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: 6,
        }}
      >
        {/* Status strip */}
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase" style={{ letterSpacing: "0.24em" }}>
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: "var(--color-accent-cyan)", boxShadow: "0 0 6px var(--color-accent-cyan)" }}
          />
          <span style={{ color: "var(--color-accent-cyan)" }}>EARLY ACCESS · DEMO</span>
          <span style={{ color: "var(--color-fg-mute)" }}>·</span>
          <span style={{ color: "var(--color-fg-mute)" }}>BUILD v0.0.14-DAY14</span>
          <span className="ml-auto" style={{ color: "var(--color-fg-mute)" }}>
            DAVENPORT · QUAD CITIES
          </span>
        </div>

        {/* Headline */}
        <div className="grid gap-3">
          <div
            className="font-mono text-[11px] uppercase"
            style={{ letterSpacing: "0.28em", color: "var(--color-fg-bright)" }}
          >
            OPERATOR SIM
          </div>
          <h1
            className="text-[64px] md:text-[88px] font-bold leading-[0.95] tracking-tight"
            style={{ color: "var(--color-fg-bright)", fontFamily: "var(--font-sans)" }}
          >
            HOLD THE FLOOR.
          </h1>
          <p
            className="text-[17px] md:text-[19px] max-w-[640px]"
            style={{ color: "var(--color-fg-dim)" }}
          >
            A dispatch simulator on the city you live in. Fire, EMS, police, SWAT — your
            console, your call, your shift. No spectacle, no tycoon meta. Just the floor.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              k: "01",
              h: "Real streets",
              b: "Davenport baked from OpenStreetMap. 26k road segments. Units route on the actual grid you've driven.",
            },
            {
              k: "02",
              h: "Multi-agency",
              b: "Engine + ladder + ambulance + patrol + K9 + SWAT. Apex events demand the right kit. Wrong agency = wrong outcome.",
            },
            {
              k: "03",
              h: "Career mode",
              b: "Three tiers gate behind shift completion. Save, replay, study your worst calls. No infinite-money sandbox.",
            },
          ].map((f) => (
            <div
              key={f.k}
              className="p-4 grid gap-2"
              style={{
                background: "var(--color-bg-elev)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div
                className="font-mono text-[10px]"
                style={{ color: "var(--color-accent-cyan)", letterSpacing: "0.2em" }}
              >
                {f.k}
              </div>
              <div className="text-[14px] font-semibold" style={{ color: "var(--color-fg-bright)" }}>
                {f.h}
              </div>
              <div className="text-[12px] leading-[1.5]" style={{ color: "var(--color-fg-dim)" }}>
                {f.b}
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={handlePlay}
            className="px-6 py-3 font-mono text-[12px] uppercase transition-all hover:brightness-110 cursor-pointer"
            style={{
              background: "var(--color-accent-cyan)",
              color: "var(--color-bg-base)",
              letterSpacing: "0.18em",
              border: "1px solid var(--color-accent-cyan)",
              fontWeight: 600,
            }}
          >
            PLAY DEMO →
          </button>
          <a
            href={STEAM_WISHLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 font-mono text-[12px] uppercase transition-all hover:brightness-110 cursor-pointer"
            style={{
              background: "transparent",
              color: "var(--color-fg-bright)",
              letterSpacing: "0.18em",
              border: "1px solid var(--color-border-bright)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            ⭐ WISHLIST ON STEAM
          </a>
          <div
            className="text-[11px] font-mono ml-2"
            style={{ color: "var(--color-fg-mute)", letterSpacing: "0.08em" }}
          >
            Demo is the dispatch console. Ctrl+K opens the palette. Type "dis" to start.
          </div>
        </div>

        {/* Footer metadata */}
        <div
          className="flex items-center justify-between pt-4 text-[10px] font-mono uppercase"
          style={{ borderTop: "1px solid var(--color-border-subtle)", letterSpacing: "0.18em" }}
        >
          <span style={{ color: "var(--color-fg-mute)" }}>WEEKLY DEVLOG · SUN 17:00 CT</span>
          <span style={{ color: "var(--color-fg-mute)" }}>SOLO BUILD · NO PUBLISHER</span>
          <span style={{ color: "var(--color-fg-mute)" }}>STEAM EA · TARGET 2026-12-31</span>
        </div>
      </div>
    </div>
  );
}
