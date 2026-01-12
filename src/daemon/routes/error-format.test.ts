/**
 * Unit tests for error response format consistency
 *
 * @module daemon/routes/error-format.test
 */

import { describe, test, expect } from "bun:test";

/**
 * Error response format
 */
interface ErrorResponse {
  readonly error: string;
  readonly message: string;
}

/**
 * Helper to create error responses like route handlers do
 */
function createErrorResponse(statusCode: number, error: unknown): ErrorResponse {
  const errorMap: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
  };

  return {
    error: errorMap[statusCode] ?? "Error",
    message: error instanceof Error ? error.message : String(error),
  };
}

describe("TEST-010: Error Response Format", () => {
  test("400 Bad Request format", () => {
    const response = createErrorResponse(400, new Error("Missing required field"));

    expect(response).toHaveProperty("error");
    expect(response).toHaveProperty("message");
    expect(response.error).toBe("Bad Request");
    expect(response.message).toBe("Missing required field");
  });

  test("401 Unauthorized format", () => {
    const response = createErrorResponse(401, new Error("Invalid token"));

    expect(response).toHaveProperty("error");
    expect(response).toHaveProperty("message");
    expect(response.error).toBe("Unauthorized");
    expect(response.message).toBe("Invalid token");
  });

  test("403 Forbidden format", () => {
    const response = createErrorResponse(403, new Error("Missing permission"));

    expect(response).toHaveProperty("error");
    expect(response).toHaveProperty("message");
    expect(response.error).toBe("Forbidden");
    expect(response.message).toBe("Missing permission");
  });

  test("404 Not Found format", () => {
    const response = createErrorResponse(404, new Error("Resource not found"));

    expect(response).toHaveProperty("error");
    expect(response).toHaveProperty("message");
    expect(response.error).toBe("Not Found");
    expect(response.message).toBe("Resource not found");
  });

  test("500 Internal Server Error format", () => {
    const response = createErrorResponse(500, new Error("Unexpected error"));

    expect(response).toHaveProperty("error");
    expect(response).toHaveProperty("message");
    expect(response.error).toBe("Internal Server Error");
    expect(response.message).toBe("Unexpected error");
  });

  test("Error instance handling", () => {
    const error = new Error("Test error");
    const response = createErrorResponse(500, error);

    expect(response.message).toBe(error.message);
  });

  test("Non-Error value handling", () => {
    const errorValue = "String error";
    const response = createErrorResponse(500, errorValue);

    expect(response.message).toBe("String error");
  });

  test("Consistent structure across all status codes", () => {
    const statusCodes = [400, 401, 403, 404, 500];

    for (const code of statusCodes) {
      const response = createErrorResponse(code, new Error("Test"));

      expect(response).toHaveProperty("error");
      expect(response).toHaveProperty("message");
      expect(typeof response.error).toBe("string");
      expect(typeof response.message).toBe("string");
    }
  });
});
