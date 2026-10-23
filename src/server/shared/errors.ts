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
    throw new ApiError(409, "CONFLICT", "Dữ liệu đã tồn tại.");
  }
  if (error.code === "23503") {
    throw new ApiError(404, "NOT_FOUND", "Dữ liệu liên quan không tồn tại.");
  }
  if (error.code === "42501") {
    throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  }
  if (error.code === "23514" || error.code === "22023") {
    throw new ApiError(400, "INVALID_INPUT", "Dữ liệu không hợp lệ.");
  }
  // Keep infrastructure details and database messages out of public responses.
  console.error("Database request failed", { code: error.code });
  throw new ApiError(503, "DATABASE_UNAVAILABLE", "Không thể truy cập dữ liệu. Kiểm tra cấu hình và migration.");
}
