import { Command } from "cmdk";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VERBS = [
  { id: "dispatch", label: "dispatch unit to incident", hint: "dispatch E1 4" },
  { id: "recall", label: "recall unit", hint: "recall E1" },
  { id: "hire", label: "hire personnel", hint: "hire firefighter" },
  { id: "fire", label: "release personnel", hint: "fire 3" },
  { id: "place_station", label: "place station", hint: "place_station fire" },
  { id: "buy_vehicle", label: "buy vehicle", hint: "buy_vehicle E1" },
  { id: "focus_entity", label: "focus on map", hint: "focus E1" },
  { id: "replay", label: "replay timeline", hint: "replay 30s" },
  { id: "pause", label: "pause game", hint: "pause" },
  { id: "save", label: "save shift", hint: "save" },
];

export function CommandPalette({ open, onOpenChange }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start pt-[15vh] bg-bg-base/70 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "w-[640px] max-w-[90vw] bg-bg-panel border border-border-bright shadow-2xl",
          "ring-1 ring-accent-cyan/30",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="bg-transparent">
          <div className="border-b border-border-subtle px-3 py-2 flex items-center gap-2">
            <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.22em]">
              Command
            </span>
            <Command.Input
              placeholder="dispatch, recall, hire, place_station…"
              className="flex-1 bg-transparent outline-none border-0 text-fg-bright placeholder:text-fg-mute font-mono text-[13px]"
              autoFocus
            />
            <kbd className="font-mono text-[10px] text-fg-mute">ESC</kbd>
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto">
            <Command.Empty className="px-3 py-6 text-center font-mono text-[11px] text-fg-mute uppercase tracking-[0.2em]">
              no matches
            </Command.Empty>
            <Command.Group heading="VERBS" className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-mute px-3 pt-2">
              {VERBS.map((v) => (
                <Command.Item
                  key={v.id}
                  value={`${v.id} ${v.label}`}
                  className={cn(
                    "px-3 py-2 cursor-pointer flex items-center justify-between",
                    "text-fg-base data-[selected=true]:bg-bg-hover data-[selected=true]:text-fg-bright",
                    "border-b border-border-subtle/50 last:border-b-0",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.18em] w-24">
                      {v.id}
                    </span>
                    <span className="text-[12px] text-fg-base">{v.label}</span>
                  </div>
                  <span className="font-mono text-[10px] text-fg-mute">{v.hint}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
