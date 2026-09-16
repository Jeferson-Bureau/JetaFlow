export class ForbiddenError extends Error {
  constructor(message = "Acesso negado") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Não encontrado") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ServiceUnavailableError extends Error {
  constructor(message = "Serviço indisponível") {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}
