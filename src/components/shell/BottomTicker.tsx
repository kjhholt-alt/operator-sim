export function BottomTicker() {
  return (
    <footer className="h-8 border-t border-border-subtle bg-bg-panel flex items-center px-4 gap-4 select-none">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">Radio</div>
      </div>
      <div className="font-mono text-[10px] text-fg-mute truncate flex-1">
        — channel cold — no traffic —
      </div>
      <div className="font-mono text-[10px] text-fg-dim">
        <span className="text-fg-mute mr-1">Build</span> v0.0.1-day0
      </div>
      <div className="font-mono text-[10px] text-fg-dim">
        <kbd className="text-fg-base">Ctrl+K</kbd>
        <span className="text-fg-mute ml-1">command</span>
      </div>
    </footer>
  );
}
