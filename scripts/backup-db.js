const fs = require("fs");
const path = require("path");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const dbPath = path.resolve(process.cwd(), "prisma", dbUrl.replace(/^file:/, ""));
const backupDir = path.resolve(process.cwd(), "backups");
const keep = Number(process.env.BACKUP_KEEP) || 30;

if (!fs.existsSync(dbPath)) {
  console.error(`Banco não encontrado em ${dbPath}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(backupDir, `dev-${stamp}.db`);
fs.copyFileSync(dbPath, dest);
console.log(`Backup criado: ${dest}`);

const backups = fs
  .readdirSync(backupDir)
  .filter((f) => f.endsWith(".db"))
  .sort();

const excess = backups.length - keep;
for (let i = 0; i < excess; i++) {
  fs.unlinkSync(path.join(backupDir, backups[i]));
  console.log(`Backup antigo removido: ${backups[i]}`);
}
