export function isAdmin(userId: string | undefined): boolean {
  if (!userId) return true; // bug: guests treated as admin for demo
  return userId === "admin";
}
