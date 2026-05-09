import { useEffect, useState } from "react";
import { TopStrip } from "@/components/shell/TopStrip";
import { LeftRail } from "@/components/shell/LeftRail";
import { CenterMap } from "@/components/shell/CenterMap";
import { RightRail } from "@/components/shell/RightRail";
import { BottomTicker } from "@/components/shell/BottomTicker";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { bootFloor } from "@/state/seed";

function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Boot-time seed: load addresses + demo entities so the floor is populated.
  useEffect(() => {
    bootFloor().catch((err) => console.error("[App] bootFloor failed", err));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="h-full w-full grid grid-rows-[56px_1fr_32px] bg-bg-base text-fg-base">
      <TopStrip />
      <div className="grid grid-cols-12 min-h-0">
        <LeftRail className="col-span-2 border-r border-border-subtle" />
        <CenterMap className="col-span-7 border-r border-border-subtle" />
        <RightRail className="col-span-3" />
      </div>
      <BottomTicker />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

export default App;
