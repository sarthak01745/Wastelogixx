import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trackingApi } from "@/services/api/tracking";

type StopValidationModalProps = {
  tripId: string | null;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  detectedLocation?: {
    cityName?: string | null;
    areaName?: string | null;
    lat?: number | null;
    lng?: number | null;
    timestamp?: string | null;
  } | null;
};

const quickReasonTemplates = [
  "Traffic enforcement checkpoint",
  "Weighbridge verification queue",
  "Municipal unloading backlog",
  "Fuel and safety pause",
];

export const StopValidationModal = ({
  tripId,
  open,
  onClose,
  onSubmitted,
  detectedLocation,
}: StopValidationModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureTimestamp, setCaptureTimestamp] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCapturedImage(null);
      setCaptureTimestamp(null);
      setReason("");
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
          },
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        toast.error("Camera access is required to validate a stop.");
      }
    };

    void startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  if (!open || !tripId) {
    return null;
  }

  const detectedPlaceLabel = detectedLocation?.areaName
    ? `${detectedLocation.areaName}${detectedLocation.cityName ? `, ${detectedLocation.cityName}` : ""}`
    : detectedLocation?.cityName ?? "Waiting for route location";

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      toast.error("Wait for the camera feed to stabilize before capturing.");
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const timestampLabel = new Date().toLocaleString();
    context.fillStyle = "rgba(17, 24, 39, 0.78)";
    context.fillRect(18, canvas.height - 52, Math.min(canvas.width - 36, 280), 34);
    context.fillStyle = "#f7f1de";
    context.font = "700 15px Inter, Arial, sans-serif";
    context.fillText(`Captured ${timestampLabel}`, 30, canvas.height - 29);
    setCaptureTimestamp(timestampLabel);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.92));
  };

  const applyQuickReason = (template: string) => {
    setReason(`${template}${detectedPlaceLabel ? ` near ${detectedPlaceLabel}` : ""}. `);
  };

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Tell dispatch why the stop happened.");
      return;
    }

    const imageBlob = capturedImage ? await fetch(capturedImage).then((response) => response.blob()).catch(() => null) : null;

    if (!imageBlob) {
      toast.error("Capture a live image before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      await trackingApi.justifyStop(tripId, reason, imageBlob);
      toast.success("Stop validation sent to compliance.");
      onClose();
      onSubmitted?.();
    } catch {
      toast.error("The stop proof could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-[30px] border-3 border-ink bg-paper p-5 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Stop validation</div>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink">Why did you stop?</h2>
          </div>
          <button className="neo-button bg-white text-ink" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-[26px] border-3 border-ink bg-[#111827]">
            {!capturedImage ? (
              <>
                <video ref={videoRef} className="h-[260px] w-full object-cover" muted playsInline />
                <div className="absolute inset-x-4 bottom-4 rounded-[18px] border-3 border-white/20 bg-black/60 px-4 py-3 text-sm text-white shadow-panel-sm">
                  <div className="font-black uppercase tracking-[0.16em] text-white/70">Live proof required</div>
                  <div className="mt-1">
                    Frame the truck, surroundings, and number plate, then capture the proof. The timestamp is stamped onto the image automatically.
                  </div>
                </div>
              </>
            ) : (
              <img alt="Captured stop proof" className="h-[260px] w-full object-cover" src={capturedImage} />
            )}
          </div>

          <div className="space-y-3.5 rounded-[26px] border-3 border-ink bg-white p-4 shadow-panel-sm">
            <div className="rounded-[18px] border-3 border-ink bg-[#f7f1de] p-3.5">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Capture workflow</div>
              <div className="mt-2 text-sm text-ink-muted">
                Step 1: capture a live image. Step 2: review the timestamped proof. Step 3: upload it with the stop reason.
              </div>
            </div>
            <div className="rounded-[18px] border-3 border-ink bg-white p-3.5">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Proof status</div>
              <div className="mt-2 text-sm font-black text-ink">{capturedImage ? "Timestamped proof captured" : "Waiting for live capture"}</div>
              <div className="mt-1 text-sm text-ink-muted">
                {captureTimestamp ? `Captured at ${captureTimestamp}` : "No image has been captured yet."}
              </div>
            </div>
            <div className="rounded-[18px] border-3 border-ink bg-white p-3.5">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Detected stop location</div>
              <div className="mt-2 text-sm font-black text-ink">{detectedPlaceLabel}</div>
              <div className="mt-1 text-sm text-ink-muted">
                {detectedLocation?.lat && detectedLocation?.lng
                  ? `${detectedLocation.lat.toFixed(4)}, ${detectedLocation.lng.toFixed(4)}`
                  : "Location will keep improving as live telemetry syncs."}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-muted">
                {detectedLocation?.timestamp ? `Last ping ${new Date(detectedLocation.timestamp).toLocaleString()}` : "Using cached route context"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Quick reason templates</div>
              <div className="flex flex-wrap gap-2">
                {quickReasonTemplates.map((template) => (
                  <button
                    key={template}
                    className="rounded-[14px] border-3 border-ink bg-[#f7f1de] px-3 py-2 text-[12px] font-bold text-ink shadow-panel-sm"
                    onClick={() => applyQuickReason(template)}
                    type="button"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="min-h-[148px] w-full rounded-[22px] border-3 border-ink bg-[#f7f1de] px-4 py-3 text-sm font-medium text-ink outline-none"
              placeholder="Describe the reason briefly. The location and timestamp context are already attached to this proof."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <button className="neo-button bg-accent-yellow text-ink" onClick={capture} type="button">
                <Camera size={16} />
                {capturedImage ? "Retake proof" : "Capture proof"}
              </button>
              <button className="neo-button bg-accent-blue text-paper" disabled={isSubmitting} onClick={submit} type="button">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
                Submit proof
              </button>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
