import { useCallback, useEffect, useState } from 'react';
import {
  ALL_PERMISSION_KEYS,
  INITIAL_APP_USERS,
  INITIAL_USER_GROUPS,
  PERMISSION_GROUPS,
  buildPresetPermissions,
} from '../data/permissionsCatalog';
import {
  AccessPresetId,
  AppUser,
  PermissionKey,
  PermissionMap,
  UserGroup,
} from '../types/permissions';

const ACCESS_STORAGE_KEY = 'order_access_groups_v2';

interface PersistedGroupAccessState {
  groups: UserGroup[];
  users: AppUser[];
}

function normalizePermissionMap(
  raw: Partial<PermissionMap> | undefined
): PermissionMap {
  const normalized = {} as PermissionMap;
  for (const key of ALL_PERMISSION_KEYS) {
    const entry = raw?.[key];
    const view = Boolean(entry?.view);
    const edit = view ? Boolean(entry?.edit) : false;
    normalized[key] = { view, edit };
  }
  return normalized;
}

function loadInitialGroupAccessState(): PersistedGroupAccessState {
  try {
    const raw = localStorage.getItem(ACCESS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedGroupAccessState;
      if (
        Array.isArray(parsed.groups) &&
        parsed.groups.length > 0 &&
        Array.isArray(parsed.users)
      ) {
        const groups = parsed.groups.map((g) => ({
          ...g,
          permissions: normalizePermissionMap(g.permissions),
        }));
        const validGroupIds = new Set(groups.map((g) => g.id));
        const fallbackGroupId = groups[0].id;
        const users = parsed.users.map((u) => ({
          ...u,
          fullName:
            u.fullName === 'امیر مرادصالحی' ? 'امیر مرادصالح' : u.fullName,
          groupId: validGroupIds.has(u.groupId) ? u.groupId : fallbackGroupId,
        }));
        return { groups, users };
      }
    }
  } catch {
    // Fallback to clean initial groups and users
  }

  return {
    groups: INITIAL_USER_GROUPS,
    users: INITIAL_APP_USERS,
  };
}

export function useAccessControl() {
  const [groups, setGroups] = useState<UserGroup[]>(
    () => loadInitialGroupAccessState().groups
  );
  const [users, setUsers] = useState<AppUser[]>(
    () => loadInitialGroupAccessState().users
  );

  useEffect(() => {
    try {
      const payload: PersistedGroupAccessState = { groups, users };
      localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [groups, users]);

  const toggleGroupPermission = useCallback(
    (groupId: string, key: PermissionKey, mode: 'view' | 'edit') => {
      setGroups((prev) =>
        prev.map((group) => {
          if (group.id !== groupId) return group;
          const current = group.permissions[key];
          if (mode === 'view') {
            const nextView = !current.view;
            return {
              ...group,
              permissions: {
                ...group.permissions,
                [key]: {
                  view: nextView,
                  edit: nextView ? current.edit : false,
                },
              },
            };
          } else {
            if (!current.view) return group;
            return {
              ...group,
              permissions: {
                ...group.permissions,
                [key]: {
                  view: true,
                  edit: !current.edit,
                },
              },
            };
          }
        })
      );
    },
    []
  );

  const setGroupSubgroupPermissions = useCallback(
    (
      groupId: string,
      subgroupId: string,
      mode: 'view' | 'edit',
      value: boolean
    ) => {
      const subgroup = PERMISSION_GROUPS.find((g) => g.id === subgroupId);
      if (!subgroup) return;

      setGroups((prev) =>
        prev.map((group) => {
          if (group.id !== groupId) return group;
          const nextPerms = { ...group.permissions };
          for (const item of subgroup.items) {
            const curr = nextPerms[item.key];
            if (mode === 'view') {
              nextPerms[item.key] = {
                view: value,
                edit: value ? curr.edit : false,
              };
            } else {
              nextPerms[item.key] = {
                view: value ? true : curr.view,
                edit: value,
              };
            }
          }
          return { ...group, permissions: nextPerms };
        })
      );
    },
    []
  );

  const setGroupCategoryPermissions = useCallback(
    (groupId: string, mode: 'view' | 'edit', value: boolean) => {
      setGroups((prev) =>
        prev.map((group) => {
          if (group.id !== groupId) return group;
          const nextPerms = { ...group.permissions };
          for (const key of ALL_PERMISSION_KEYS) {
            const curr = nextPerms[key];
            if (mode === 'view') {
              nextPerms[key] = {
                view: value,
                edit: value ? curr.edit : false,
              };
            } else {
              nextPerms[key] = {
                view: value ? true : curr.view,
                edit: value,
              };
            }
          }
          return { ...group, permissions: nextPerms };
        })
      );
    },
    []
  );

  const applyPresetToGroup = useCallback(
    (groupId: string, preset: AccessPresetId) => {
      setGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? { ...group, permissions: buildPresetPermissions(preset) }
            : group
        )
      );
    },
    []
  );

  const createGroup = useCallback(
    (name: string, description: string, preset: AccessPresetId): UserGroup => {
      const newGroup: UserGroup = {
        id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        description:
          description.trim() || 'گروه کاربری سفارشی در کتگوری سفارشات',
        permissions: buildPresetPermissions(preset),
      };
      setGroups((prev) => [...prev, newGroup]);
      return newGroup;
    },
    []
  );

  const deleteGroup = useCallback((groupId: string) => {
    setGroups((prev) => {
      const target = prev.find((g) => g.id === groupId);
      if (!target || target.isSystemGroup || prev.length <= 1) return prev;
      const remaining = prev.filter((g) => g.id !== groupId);
      const fallbackGroupId = remaining[0].id;
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.groupId === groupId ? { ...u, groupId: fallbackGroupId } : u
        )
      );
      return remaining;
    });
  }, []);

  const createUser = useCallback(
    (
      fullName: string,
      roleTitle: string,
      phone: string,
      groupId: string
    ): AppUser => {
      const newUser: AppUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fullName: fullName.trim(),
        roleTitle: roleTitle.trim(),
        phone: phone.trim() || '—',
        groupId,
      };
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    },
    []
  );

  const assignUserToGroup = useCallback((userId: string, groupId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, groupId } : user
      )
    );
  }, []);

  const deleteUser = useCallback((userId: string) => {
    setUsers((prev) => {
      const target = prev.find((u) => u.id === userId);
      if (!target || target.isSystemAdmin) return prev;
      return prev.filter((u) => u.id !== userId);
    });
  }, []);

  const resetAccessControl = useCallback(() => {
    setGroups(INITIAL_USER_GROUPS);
    setUsers(INITIAL_APP_USERS);
    localStorage.removeItem(ACCESS_STORAGE_KEY);
  }, []);

  return {
    groups,
    users,
    toggleGroupPermission,
    setGroupSubgroupPermissions,
    setGroupCategoryPermissions,
    applyPresetToGroup,
    createGroup,
    deleteGroup,
    createUser,
    assignUserToGroup,
    deleteUser,
    resetAccessControl,
  };
}
