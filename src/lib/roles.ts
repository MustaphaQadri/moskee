export const ROLES = ["manager", "teacher"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

// Managers have full access (create classes, register children/guardians,
// manage teachers). Teachers can view and manage their own classes and the
// children enrolled in them.
export const MANAGER_ROLE: Role = "manager";
export const TEACHER_ROLE: Role = "teacher";
