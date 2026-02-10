import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, "report-template.html");
const STYLES_PATH = path.join(__dirname, "styles.css");

const safeJson = (obj) =>
  JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

export async function generateReportPdf({
  reportData,
  meeting,
  transcript,
  organization,
  orgLogo,
}) {
  const template = await fs.readFile(TEMPLATE_PATH, "utf-8");
  const styles = await fs.readFile(STYLES_PATH, "utf-8");

  const payload = {
    reportData: reportData || {},
    meeting: meeting || {},
    transcript: transcript || {},
    organization: organization || "",
    orgLogo: orgLogo || "",
  };

  let html = template.replace(
    "/*__REPORT_PAYLOAD__*/",
    safeJson(payload),
  );

  html = html.replace(
    '<link rel="stylesheet" href="./styles.css" />',
    `<style>${styles}</style>`,
  );

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  await page.setContent(html, { waitUntil: ["load", "networkidle0"] });
  await page.emulateMediaType("screen");

  await page.waitForFunction("window.__PDF_RENDER_DONE__ === true", {
    timeout: 30000,
  });

  const { width, height } = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const heightPx = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight,
    );
    return { width: 794, height: heightPx }; // 794px ≈ A4 width at 96 DPI
  });

  const pdfBuffer = await page.pdf({
    width: `${width}px`,
    height: `${height}px`,
    printBackground: true,
    margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    preferCSSPageSize: false,
  });

  await page.close();
  await browser.close();

  return pdfBuffer;
}