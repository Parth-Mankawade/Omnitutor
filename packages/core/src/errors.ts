import type { ApiErrorCode } from "@sc/schemas";

/** A failure the API reports to the client as ApiErrorBody with this code (see API_ERROR_STATUS). */
export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string) => new AppError("bad_request", message);
export const notFound = (message: string) => new AppError("not_found", message);
export const notReady = (message: string) => new AppError("not_ready", message);
