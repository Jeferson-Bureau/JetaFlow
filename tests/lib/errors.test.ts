import { describe, it, expect } from "vitest";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

describe("handleApiError", () => {
  it("maps ForbiddenError to 403", () => {
    const response = handleApiError(new ForbiddenError());
    expect(response.status).toBe(403);
  });

  it("maps NotFoundError to 404", () => {
    const response = handleApiError(new NotFoundError());
    expect(response.status).toBe(404);
  });

  it("maps unknown errors to 500", () => {
    const response = handleApiError(new Error("boom"));
    expect(response.status).toBe(500);
  });
});
