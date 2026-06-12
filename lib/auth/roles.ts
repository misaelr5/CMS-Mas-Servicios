export type Role = "admin" | "encargado" | "cajero" | "viewer";

export const roles: Role[] = ["admin", "encargado", "cajero", "viewer"];

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  encargado: "Encargado",
  cajero: "Cajero",
  viewer: "Viewer"
};

const routePermissions: Array<{ pattern: RegExp; roles: Role[] }> = [
  { pattern: /^\/dashboard(?:\/.*)?$/, roles: ["admin", "encargado", "viewer"] },
  { pattern: /^\/bolsas(?:\/.*)?$/, roles: ["admin", "encargado", "cajero", "viewer"] },
  { pattern: /^\/cajas\/[^/]+\/cargar$/, roles: ["admin", "encargado", "cajero"] },
  { pattern: /^\/cajas(?:\/.*)?$/, roles: ["admin", "encargado", "cajero", "viewer"] },
  { pattern: /^\/reporte-diario(?:\/.*)?$/, roles: ["admin", "encargado", "cajero", "viewer"] },
  { pattern: /^\/gastos(?:\/.*)?$/, roles: ["admin", "encargado", "cajero", "viewer"] },
  { pattern: /^\/cierres(?:\/.*)?$/, roles: ["admin", "encargado", "viewer"] },
  { pattern: /^\/usuarios(?:\/.*)?$/, roles: ["admin"] },
  { pattern: /^\/configuracion(?:\/.*)?$/, roles: ["admin"] }
];

export function normalizeRole(role?: string | null): Role {
  if (role === "admin" || role === "encargado" || role === "cajero" || role === "viewer") return role;
  return "viewer";
}

export function isAdmin(role: Role) {
  return role === "admin";
}

export function getHomePathForRole(role: Role) {
  return role === "cajero" ? "/bolsas" : "/dashboard";
}

export function canAccessPath(role: Role, pathname: string) {
  if (isAdmin(role)) return true;
  const match = routePermissions.find((entry) => entry.pattern.test(pathname));
  if (!match) return true;
  return match.roles.includes(role);
}

export function allowedRolesForPath(pathname: string) {
  return routePermissions.find((entry) => entry.pattern.test(pathname))?.roles ?? roles;
}
