export type SecurityHeaders = Record<string, string>;

export function contentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src 'self'${isDevelopment ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDevelopment) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function securityHeaders(nonce: string, isDevelopment: boolean): SecurityHeaders {
  const headers: SecurityHeaders = {
    "Content-Security-Policy": contentSecurityPolicy(nonce, isDevelopment),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  if (!isDevelopment) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }
  return headers;
}
