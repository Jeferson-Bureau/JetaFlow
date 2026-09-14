import { NextResponse } from "next/server";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export function handleApiError(error: unknown) {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error(error);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
