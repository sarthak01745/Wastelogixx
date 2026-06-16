import { APP_ASSET_BASE_URL, api } from "./client";
import type { Invoice } from "@/types/domain";

const resolveInvoiceUrl = (pdfUrl: string) => {
  if (/^https?:\/\//i.test(pdfUrl)) {
    return pdfUrl;
  }

  return new URL(pdfUrl, `${APP_ASSET_BASE_URL}/`).toString();
};

const buildInvoiceFileName = (tripId: string, pdfUrl?: string) => {
  if (pdfUrl) {
    const lastSegment = pdfUrl.split("/").pop()?.split("?")[0];

    if (lastSegment?.toLowerCase().endsWith(".pdf")) {
      return lastSegment;
    }
  }

  return `wastelogix-invoice-${tripId}.pdf`;
};

const downloadInvoiceBlob = async (pdfUrl: string, tripId: string) => {
  const response = await fetch(resolveInvoiceUrl(pdfUrl));

  if (!response.ok) {
    throw new Error("Invoice PDF could not be downloaded");
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = buildInvoiceFileName(tripId, pdfUrl);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
};

export const invoiceApi = {
  list: async () => {
    const { data } = await api.get<Invoice[]>("/invoices");
    return data;
  },
  generate: async (tripId: string) => {
    const { data } = await api.post<Invoice>(`/invoices/${tripId}/generate`);
    return data;
  },
  downloadPdf: async (tripId: string, pdfUrl: string) => {
    await downloadInvoiceBlob(pdfUrl, tripId);
  },
  generateAndDownload: async (tripId: string) => {
    const invoice = await invoiceApi.generate(tripId);
    await downloadInvoiceBlob(invoice.pdfUrl, tripId);
    return invoice;
  },
};
