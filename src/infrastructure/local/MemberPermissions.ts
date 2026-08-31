/**
 * ChoreScore V2 — Member Permission Resolution
 *
 * Enforces role-based permissions per household.
 * OWNER > PAYER > ADMIN > MEMBER.
 *
 * Permissions are resolved per-household, never globally.
 * The permission level is derived from the Membership role
 * and optionally from billing payer status.
 */

import {
  MemberPermissionLevel,
  MemberPermissions,
} from '../../application/ports';

/**
 * Default permissions for each role level.
 * Higher roles inherit all permissions from lower roles.
 */
const ROLE_HIERARCHY: MemberPermissionLevel[] = ['MEMBER', 'ADMIN', 'PAYER', 'OWNER'];

const DEFAULT_PERMISSIONS: Record<MemberPermissionLevel, MemberPermissions> = {
  MEMBER: {
    canCreateEntry: true,
    canEditAnyEntry: false,
    canDeleteAnyEntry: false,
    canManagePersistentTasks: false,
    canManageTodos: false,
    canViewFullHistory: false,
    canManageMembers: false,
    canManageBilling: false,
    canManageHouseholdOptions: false,
    canInviteMembers: false,
    canRemoveMembers: false,
  },
  ADMIN: {
    canCreateEntry: true,
    canEditAnyEntry: true,
    canDeleteAnyEntry: false,
    canManagePersistentTasks: true,
    canManageTodos: true,
    canViewFullHistory: true,
    canManageMembers: false,
    canManageBilling: false,
    canManageHouseholdOptions: false,
    canInviteMembers: true,
    canRemoveMembers: false,
  },
  PAYER: {
    canCreateEntry: true,
    canEditAnyEntry: true,
    canDeleteAnyEntry: true,
    canManagePersistentTasks: true,
    canManageTodos: true,
    canViewFullHistory: true,
    canManageMembers: true,
    canManageBilling: true,
    canManageHouseholdOptions: true,
    canInviteMembers: true,
    canRemoveMembers: true,
  },
  OWNER: {
    canCreateEntry: true,
    canEditAnyEntry: true,
    canDeleteAnyEntry: true,
    canManagePersistentTasks: true,
    canManageTodos: true,
    canViewFullHistory: true,
    canManageMembers: true,
    canManageBilling: true,
    canManageHouseholdOptions: true,
    canInviteMembers: true,
    canRemoveMembers: true,
  },
};

/**
 * Resolve the permission level from a membership role and payer status.
 */
export function resolvePermissionLevel(
  role: 'MEMBER' | 'OWNER',
  isPayer: boolean
): MemberPermissionLevel {
  if (role === 'OWNER') return 'OWNER';
  if (isPayer) return 'PAYER';
  return 'MEMBER';
}

/**
 * Get permissions for a given permission level.
 */
export function getPermissionsForLevel(level: MemberPermissionLevel): MemberPermissions {
  return { ...DEFAULT_PERMISSIONS[level] };
}

/**
 * Check if a member has a specific permission.
 */
export function hasPermission(
  level: MemberPermissionLevel,
  permission: keyof MemberPermissions
): boolean {
  return DEFAULT_PERMISSIONS[level][permission];
}

/**
 * Get the role hierarchy index (higher = more permissions).
 */
export function getRoleHierarchyIndex(level: MemberPermissionLevel): number {
  return ROLE_HIERARCHY.indexOf(level);
}

/**
 * Check if one role level has more permissions than another.
 */
export function hasHigherPermission(
  a: MemberPermissionLevel,
  b: MemberPermissionLevel
): boolean {
  return getRoleHierarchyIndex(a) > getRoleHierarchyIndex(b);
}
