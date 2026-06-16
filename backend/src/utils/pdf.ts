import puppeteer from "puppeteer";
import { env } from "../config/env";

export const renderPdf = async (html: string, path: string) => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await page.pdf({
      path,
      format: "A4",
      printBackground: true,
      margin: {
        top: "24px",
        right: "24px",
        bottom: "24px",
        left: "24px",
      },
    });
  } finally {
    await browser.close();
  }
};
