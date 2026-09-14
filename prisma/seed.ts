import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@jetaprint.com.br";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  await prisma.user.create({
    data: {
      nome: "Administrador",
      email,
      senhaHash: await bcrypt.hash("jetaflow123", 10),
      role: "ADMIN",
      ativo: true,
    },
  });
  console.log(`Usuário admin criado: ${email} / senha: jetaflow123`);
}

main().finally(() => prisma.$disconnect());
