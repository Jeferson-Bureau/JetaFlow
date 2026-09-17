// Entry point for a standalone child process — never imported from app/.
// @react-pdf/renderer does its own React reconciliation; loaded through
// Next's app-router module graph it resolves a second, incompatible React
// instance and throws "Objects are not valid as a React child" (React
// error #31) on every render, in both `next dev` and a production build.
// Running the render here, in a plain Node process spawned via tsx (see
// renderPdfInWorker.ts), sidesteps Next's module graph entirely.
import { renderToBuffer } from "@react-pdf/renderer";
import { EtiquetaPdfDocument } from "./etiquetaPdf";
import { OrcamentoPdfDocument } from "./orcamentoPdf";
import { EtiquetaAvulsaPdfDocument } from "./etiquetaAvulsaPdf";
import type { PdfWorkerJob } from "./renderPdfInWorker";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  const job: PdfWorkerJob = JSON.parse(await readStdin());

  let buffer: Buffer;
  switch (job.type) {
    case "etiqueta":
      buffer = await renderToBuffer(<EtiquetaPdfDocument {...job.props} />);
      break;
    case "orcamento":
      buffer = await renderToBuffer(<OrcamentoPdfDocument {...job.props} />);
      break;
    case "etiquetaAvulsa":
      buffer = await renderToBuffer(<EtiquetaAvulsaPdfDocument {...job.props} />);
      break;
  }
  process.stdout.write(buffer);
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
});
