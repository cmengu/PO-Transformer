import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./headers";

describe("security headers", () => {
  it("uses a nonce and safe defaults in production", () => {
    const headers = securityHeaders("test-nonce", false);

    expect(headers["Content-Security-Policy"]).toContain("'nonce-test-nonce'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).not.toContain("unsafe-eval");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Strict-Transport-Security"]).toContain("includeSubDomains");
  });

  it("keeps development tooling working without enabling HSTS locally", () => {
    const csp = contentSecurityPolicy("test-nonce", true);
    const headers = securityHeaders("test-nonce", true);

    expect(csp).toContain("unsafe-eval");
    expect(csp).toContain("connect-src 'self' ws:");
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });
});
