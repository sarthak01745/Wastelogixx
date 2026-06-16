import { useMutation } from "@tanstack/react-query";
import { FileText, Truck } from "lucide-react";
import { toast } from "sonner";
import { DriverMetricsGrid } from "@/components/driver/DriverMetricsGrid";
import { formatDriverCurrency } from "@/features/driver/driver-config";
import { invoiceApi } from "@/services/api/invoices";
import { useDriverLayout } from "./DriverLayout";

const DriverInvoicesPage = () => {
  const { dashboardData, refreshDriverOverview } = useDriverLayout();

  const invoiceMutation = useMutation({
    mutationFn: (taskId: string) => invoiceApi.generateAndDownload(taskId),
    onSuccess: () => {
      toast.success("Invoice downloaded.");
      refreshDriverOverview();
    },
    onError: () => toast.error("Invoice download failed."),
  });

  const downloadMutation = useMutation({
    mutationFn: ({ tripId, pdfUrl }: { tripId: string; pdfUrl: string }) => invoiceApi.downloadPdf(tripId, pdfUrl),
    onSuccess: () => {
      toast.success("Invoice downloaded.");
    },
    onError: () => toast.error("Invoice download failed."),
  });

  return (
    <div className="space-y-5">
      <DriverMetricsGrid overview={dashboardData} />

      <section className="panel-card">
        <div className="eyebrow">Invoices</div>
        <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">Completed trip payouts</h2>
        <div className="mt-4.5 space-y-2.5">
          {dashboardData.recentInvoices.map((trip) => (
            <div key={trip.id} className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-black text-ink">
                    {trip.routeStartCity ?? trip.routeStart} to {trip.routeEndCity ?? trip.routeEnd}
                  </div>
                  <div className="text-sm text-ink-muted">
                    {trip.truck?.truckNumber ?? "No truck"} / {formatDriverCurrency(trip.paymentAmount)}
                  </div>
                  <div className="mt-2 text-sm text-ink-muted">
                    {trip.invoice?.generatedAt ? `Generated ${new Date(trip.invoice.generatedAt).toLocaleString()}` : "PDF not generated yet"}
                  </div>
                </div>
                <div className="flex gap-2">
                  {trip.invoice?.pdfUrl ? (
                    <button
                      className="neo-button bg-white text-ink"
                      onClick={() => downloadMutation.mutate({ tripId: trip.id, pdfUrl: trip.invoice!.pdfUrl })}
                      type="button"
                    >
                      <FileText size={16} />
                      Download PDF
                    </button>
                  ) : (
                    <button
                      className="neo-button bg-accent-yellow text-ink"
                      onClick={() => invoiceMutation.mutate(trip.id)}
                      type="button"
                    >
                      <Truck size={16} />
                      Generate PDF
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3.5 grid gap-2.5 md:grid-cols-2">
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3 text-sm font-bold text-ink">
                  {trip.loadType ?? "Load complete"} / {trip.loadWeightKg?.toLocaleString() ?? 0} kg
                </div>
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3 text-sm font-bold text-ink">
                  {Number(trip.actualDistanceKm ?? trip.expectedDistanceKm ?? 0).toFixed(0)} km
                </div>
              </div>
            </div>
          ))}
          {dashboardData.recentInvoices.length === 0 ? (
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm text-sm text-ink-muted">
              No completed trips are available for invoice generation yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default DriverInvoicesPage;
