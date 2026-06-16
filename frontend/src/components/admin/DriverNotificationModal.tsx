import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { trackingApi } from "@/services/api/tracking";
import { api } from "@/services/api/client";
import type { Severity } from "@/types/domain";

type DriverNotificationModalProps = {
  tripId: string;
  driverId: string;
  anomalyId: string;
  open: boolean;
  onClose: () => void;
};

const templates = [
  "Account Warning: Unjustified Stop Policy",
  "Compliance: Please submit payload validation photo",
  "Require Immediate Justification for Route Deviation",
];

export const DriverNotificationModal = ({
  tripId,
  driverId,
  anomalyId,
  open,
  onClose,
}: DriverNotificationModalProps) => {
  const [title, setTitle] = useState(templates[0]);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("HIGH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  const submit = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please provide both a title and a message.");
      return;
    }

    try {
      setIsSubmitting(true);
        await api.post("/alerts/notify-driver", {
          tripId,
          driverId,
          anomalyId,
          title,
          message,
          severity,
        });

      toast.success("Notification sent to driver.");
      onClose();
      setMessage("");
    } catch {
      toast.error("Could not send notification right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg rounded-[30px] border-3 border-ink bg-paper p-6 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Dispatch Command</div>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-ink">Notify Driver</h2>
          </div>
          <button className="neo-button bg-white text-ink" onClick={onClose} type="button">
            Cancel
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-ink-muted">
              Select predefined title
            </label>
            <div className="flex flex-col gap-2">
              {templates.map((t) => (
                <button
                  key={t}
                  className={`rounded-[14px] border-3 border-ink px-4 py-2.5 text-left text-sm font-bold shadow-panel-sm transition-colors ${
                    title === t ? "bg-accent-yellow text-ink" : "bg-white text-ink hover:bg-[#f7f1de]"
                  }`}
                  onClick={() => setTitle(t)}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 mt-4 block text-xs font-black uppercase tracking-[0.16em] text-ink-muted">
              Custom Message
            </label>
            <textarea
              className="min-h-[100px] w-full rounded-[18px] border-3 border-ink bg-white px-4 py-3 text-sm font-medium text-ink shadow-panel-sm outline-none"
              placeholder="E.g., You stopped in a restricted zone. Please justify or your pay will be reduced."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-ink-muted">
              Severity Level
            </label>
            <select
              className="w-full rounded-[18px] border-3 border-ink bg-white px-4 py-3 text-sm font-bold text-ink shadow-panel-sm outline-none"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
            >
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              className="neo-button w-full justify-center bg-accent-blue text-paper"
              disabled={isSubmitting}
              onClick={submit}
              type="button"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Send Alert to Driver Feed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
