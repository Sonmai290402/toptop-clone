export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function databaseError(error: { code?: string; message: string }): never {
  if (error.code === "23505") {
    throw new ApiError(409, "CONFLICT", "The record already exists.");
  }
  if (error.code === "23503") {
    throw new ApiError(404, "NOT_FOUND", "The related record does not exist.");
  }
  if (error.code === "42501") {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }
  if (error.code === "23514" || error.code === "22023") {
    throw new ApiError(400, "INVALID_INPUT", "Invalid input.");
  }
  // Keep infrastructure details and database messages out of public responses.
  console.error("Database request failed", { code: error.code });
  throw new ApiError(503, "DATABASE_UNAVAILABLE", "Unable to access the database. Check the configuration and migrations.");
}
