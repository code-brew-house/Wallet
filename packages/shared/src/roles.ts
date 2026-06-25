export const roles = ['owner', 'admin', 'member'] as const;
export type Role = (typeof roles)[number];

export function canManageGroup(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}
