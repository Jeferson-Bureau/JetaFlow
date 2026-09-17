import { spawn } from "node:child_process";
import path from "node:path";
import type { ComponentProps } from "react";
import type { EtiquetaPdfDocument } from "./etiquetaPdf";
import type { OrcamentoPdfDocument } from "./orcamentoPdf";
import type { EtiquetaAvulsaPdfDocument } from "./etiquetaAvulsaPdf";

// See pdfWorker.tsx for why this runs out-of-process. Props round-trip
// through JSON (Date fields arrive as strings in the worker); EtiquetaAvulsa
// passes emitidoEm as an ISO string to avoid the Date → string coercion issue.
export type PdfWorkerJob =
  | { type: "etiqueta"; props: ComponentProps<typeof EtiquetaPdfDocument> }
  | { type: "orcamento"; props: ComponentProps<typeof OrcamentoPdfDocument> }
  | { type: "etiquetaAvulsa"; props: ComponentProps<typeof EtiquetaAvulsaPdfDocument> };

export async function renderPdfInWorker(job: PdfWorkerJob): Promise<Buffer> {
  const tsxCli = path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs");
  const tsconfig = path.join(process.cwd(), "scripts/tsconfig.pdf-worker.json");
  const workerScript = path.join(process.cwd(), "lib/pdf/pdfWorker.tsx");

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, "--tsconfig", tsconfig, workerScript], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Falha ao gerar PDF: ${Buffer.concat(stderr).toString("utf-8")}`));
        return;
      }
      resolve(Buffer.concat(stdout));
    });

    child.stdin.write(JSON.stringify(job));
    child.stdin.end();
  });
}
