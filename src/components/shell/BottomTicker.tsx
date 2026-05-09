import { useFloor } from "@/state/useFloor";

export function BottomTicker() {
  const log = useFloor((s) => s.last_event_log);
  const latest = log[0]?.text ?? "— channel cold — no traffic —";
  const game_min = log[0]?.game_min;
  return (
    <footer className="h-8 border-t border-border-subtle bg-bg-panel flex items-center px-4 gap-4 select-none">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">Radio</div>
      </div>
      {game_min !== undefined && (
        <div className="font-mono text-[10px] text-accent-cyan tabular-nums">
          T+{game_min.toFixed(1)}
        </div>
      )}
      <div className="font-mono text-[10px] text-fg-base truncate flex-1">
        {latest}
      </div>
      <div className="font-mono text-[10px] text-fg-dim">
        <span className="text-fg-mute mr-1">Build</span> v0.0.5-day5
      </div>
      <div className="font-mono text-[10px] text-fg-dim">
        <kbd className="text-fg-base">Ctrl+K</kbd>
        <span className="text-fg-mute ml-1">command</span>
      </div>
    </footer>
  );
}
