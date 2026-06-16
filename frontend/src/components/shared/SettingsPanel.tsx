import { Check, Settings2, X } from "lucide-react";

type SettingsOption = {
  key: string;
  label: string;
  description: string;
};

type SettingsPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  values: Record<string, boolean>;
  options: SettingsOption[];
  onToggle: (key: string) => void;
};

export const SettingsPanel = ({
  eyebrow,
  title,
  description,
  values,
  options,
  onToggle,
}: SettingsPanelProps) => {
  return (
    <section className="panel-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="mt-1.5 text-[1.05rem] font-black tracking-[-0.04em] text-ink lg:text-[1.15rem]">{title}</h2>
          <p className="mt-1.5 max-w-xl text-[12px] leading-5 text-ink-muted">{description}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border-3 border-ink bg-accent-yellow shadow-panel-sm">
          <Settings2 className="text-ink" size={15} />
        </div>
      </div>

      <div className="mt-3.5 grid gap-2.5 xl:grid-cols-2">
        {options.map((option) => {
          const active = Boolean(values[option.key]);

          return (
            <button
              key={option.key}
              className={`rounded-[16px] border-3 border-ink p-3 text-left transition ${
                active ? "bg-[#111827] text-paper shadow-panel-sm" : "bg-white text-ink shadow-panel-sm"
              }`}
              onClick={() => onToggle(option.key)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em]">{option.label}</div>
                  <p className={`mt-1 text-[12px] leading-5 ${active ? "text-white/70" : "text-ink-muted"}`}>{option.description}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                    active
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-black/10 bg-[#f2ede0] text-ink-muted"
                  }`}
                >
                  {active ? <Check size={12} /> : <X size={12} />}
                  {active ? "On" : "Off"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
