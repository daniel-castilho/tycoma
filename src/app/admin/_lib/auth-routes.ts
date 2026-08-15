const PUBLIC_ADMIN_PREFIXES = [
  "/admin/setup",
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
];

export function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
