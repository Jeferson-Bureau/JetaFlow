import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@jetaprint.com.br";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const senha = process.env.SEED_ADMIN_PASSWORD || "jetaflow123";

  await prisma.user.create({
    data: {
      nome: "Administrador",
      email,
      senhaHash: await bcrypt.hash(senha, 10),
      role: "ADMIN",
      ativo: true,
    },
  });

  if (process.env.SEED_ADMIN_PASSWORD) {
    console.log(`Usuário admin criado: ${email} (senha definida via SEED_ADMIN_PASSWORD)`);
  } else {
    console.log(
      `Usuário admin criado: ${email} / senha: jetaflow123 — ATENÇÃO: senha padrão de desenvolvimento, troque antes de ir para produção (defina SEED_ADMIN_PASSWORD ou altere pela tela de Usuários).`
    );
  }
}

main().finally(() => prisma.$disconnect());
