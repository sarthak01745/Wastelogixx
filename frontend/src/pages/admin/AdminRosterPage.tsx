import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { useSmoothNavigate } from "@/hooks/useSmoothNavigate";
import { MetricTile } from "@/components/shared/MetricTile";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatCurrency, formatDistance, formatDuration } from "@/features/admin/admin-config";
import { useAdminRealtimeInvalidation } from "@/features/admin/useAdminRealtimeInvalidation";
import { dashboardApi } from "@/services/api/dashboard";
import { invoiceApi } from "@/services/api/invoices";
import { taskApi } from "@/services/api/tasks";

const AdminRosterPage = () => {
  const smoothNavigate = useSmoothNavigate();

  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: dashboardApi.admin,
    refetchInterval: 20000,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: taskApi.list,
  });

  useAdminRealtimeInvalidation();

  const invoiceMutation = useMutation({
    mutationFn: (taskId: string) => invoiceApi.generateAndDownload(taskId),
    onSuccess: () => {
      toast.success("Invoice downloaded.");
    },
    onError: () => {
      toast.error("Invoice download failed.");
    },
  });

  const downloadMutation = useMutation({
    mutationFn: ({ tripId, pdfUrl }: { tripId: string; pdfUrl: string }) => invoiceApi.downloadPdf(tripId, pdfUrl),
    onSuccess: () => {
      toast.success("Invoice downloaded.");
    },
    onError: () => {
      toast.error("Invoice download failed.");
    },
  });

  const tasks = tasksQuery.data ?? [];
  const loading = tasksQuery.isLoading || overviewQuery.isLoading;

  const rosterMetrics = useMemo(
    () => [
      {
        label: "Trip roster",
        value: tasks.length,
        description: "Assignments currently listed in the dispatch queue.",
      },
      {
        label: "Invoices ready",
        value: tasks.filter((task) => Boolean(task.invoice?.pdfUrl)).length,
        description: "Trips with a generated invoice file ready for download.",
      },
      {
        label: "Trips awaiting invoice",
        value: tasks.filter((task) => task.status === "COMPLETED" && !task.invoice?.pdfUrl).length,
        description: "Completed trips that still need a PDF generated.",
      },
      {
        label: "Planned payout",
        value: formatCurrency(tasks.reduce((sum, task) => sum + Number(task.paymentAmount ?? 0), 0)),
        description: "Total payout across the listed roster.",
      },
    ],
    [tasks],
  );

  if (loading) {
    return <div className="panel-card text-sm text-ink-muted">Loading assignment roster...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-4">
        {rosterMetrics.map((metric) => (
          <MetricTile key={metric.label} description={metric.description} label={metric.label} value={metric.value} />
        ))}
      </div>

      <section className="panel-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Trips</div>
            <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">Assignment roster and invoices</h2>
          </div>
          <div className="rounded-[16px] border-3 border-ink bg-accent-yellow px-3.5 py-2.5 text-sm font-black text-ink shadow-panel-sm">
            {overviewQuery.data?.fleet.length ?? 0} trucks available for dispatch
          </div>
        </div>

        <div className="mt-4.5 space-y-2.5">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-[18px] border-3 border-ink bg-white p-3 shadow-panel-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-black leading-6 text-ink">
                    {task.routeStartCity ?? task.routeStart} to {task.routeEndCity ?? task.routeEnd}
                  </div>
                  <div className="text-[12px] leading-5 text-ink-muted">
                    {task.routeStartArea ?? task.routeStart} - {task.routeEndArea ?? task.routeEnd}
                  </div>
                  <div className="mt-1.5 text-sm text-ink-muted">
                    {task.driver?.name} - {task.truck?.truckNumber} - {task.truck?.model ?? "Fleet truck"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill value={task.status} />
                  <StatusPill value={task.riskLevel} />
                </div>
              </div>

              <div className="mt-3.5 grid gap-2.5 lg:grid-cols-4">
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.15em] text-ink-muted">Route plan</div>
                  <div className="mt-1.5 text-sm font-black text-ink">
                    {formatDistance(task.expectedDistanceKm)} / {formatDuration(task.estimatedDuration)}
                  </div>
                </div>
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.15em] text-ink-muted">Payload</div>
                  <div className="mt-1.5 text-sm font-black text-ink">
                    {task.loadType ?? "No load type"} / {task.loadWeightKg?.toLocaleString() ?? 0} kg
                  </div>
                </div>
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.15em] text-ink-muted">Manifest</div>
                  <div className="mt-1.5 text-sm font-black text-ink">{task.manifestCode ?? "Pending manifest"}</div>
                </div>
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.15em] text-ink-muted">Payment</div>
                  <div className="mt-1.5 text-sm font-black text-ink">{formatCurrency(task.paymentAmount)}</div>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap gap-2.5">
                <button
                  className="neo-button bg-ink text-paper"
                  onClick={() => smoothNavigate(`/app/admin/replay?task=${task.id}`)}
                  type="button"
                >
                  Replay
                  <ArrowRight size={15} />
                </button>
                {task.invoice?.pdfUrl ? (
                  <button
                    className="neo-button bg-white text-ink"
                    onClick={() => downloadMutation.mutate({ tripId: task.id, pdfUrl: task.invoice!.pdfUrl })}
                    type="button"
                  >
                    <FileText size={15} />
                    Download invoice
                  </button>
                ) : (
                  <button className="neo-button bg-white text-ink" onClick={() => invoiceMutation.mutate(task.id)} type="button">
                    <FileText size={15} />
                    Generate PDF
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminRosterPage;
