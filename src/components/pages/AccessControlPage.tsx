import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Edit3,
  Eye,
  FolderKanban,
  Images,
  Info,
  Layers,
  Link2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  ACCESS_PRESET_LABELS,
  ALL_PERMISSION_KEYS,
  PERMISSION_CATEGORIES,
} from '../../data/permissionsCatalog';
import {
  AccessPresetId,
  AppUser,
  PermissionCategoryId,
  PermissionKey,
  UserGroup,
} from '../../types/permissions';
import { toPersianDigits } from '../../utils/jalaliCalendar';

interface AccessControlPageProps {
  groups: UserGroup[];
  users: AppUser[];
  onToggleGroupPermission: (
    groupId: string,
    key: PermissionKey,
    mode: 'view' | 'edit'
  ) => void;
  onSetGroupSubgroupPermissions: (
    groupId: string,
    subgroupId: string,
    mode: 'view' | 'edit',
    value: boolean
  ) => void;
  onSetGroupCategoryPermissions: (
    groupId: string,
    categoryId: PermissionCategoryId,
    mode: 'view' | 'edit',
    value: boolean
  ) => void;
  onApplyPresetToGroup: (groupId: string, preset: AccessPresetId) => void;
  onCreateGroup: (
    name: string,
    description: string,
    preset: AccessPresetId
  ) => UserGroup;
  onDeleteGroup: (groupId: string) => void;
  onCreateUser: (
    fullName: string,
    roleTitle: string,
    phone: string,
    groupId: string
  ) => AppUser;
  onAssignUserToGroup: (userId: string, groupId: string) => void;
  onDeleteUser: (userId: string) => void;
}

type AccessTab = 'groups' | 'users';
type CategoryFilter = 'all' | PermissionCategoryId;

const CATEGORY_VISUALS: Record<
  PermissionCategoryId,
  {
    icon: React.FC<{ className?: string }>;
    headerBg: string;
    borderClass: string;
  }
> = {
  orders: {
    icon: FolderKanban,
    headerBg: 'bg-[#0f5864]',
    borderClass: 'border-[#7a9cbf]',
  },
  customers: {
    icon: Users,
    headerBg: 'bg-[#1e3a5f]',
    borderClass: 'border-slate-300',
  },
  product_photos: {
    icon: Images,
    headerBg: 'bg-[#115e59]',
    borderClass: 'border-teal-300',
  },
};

interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  title?: string;
  variant?: 'view' | 'edit';
  onChange: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  disabled = false,
  label,
  title,
  variant = 'view',
  onChange,
}) => {
  const activeBg = variant === 'edit' ? 'bg-emerald-600' : 'bg-[#0f5864]';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864] focus-visible:ring-offset-1 ${
        disabled
          ? 'bg-slate-200 opacity-45 cursor-not-allowed'
          : checked
            ? `${activeBg} cursor-pointer`
            : 'bg-slate-300 hover:bg-slate-400 cursor-pointer'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-150 ${
          checked ? '-translate-x-6' : '-translate-x-1'
        }`}
      />
    </button>
  );
};

export const AccessControlPage: React.FC<AccessControlPageProps> = ({
  groups,
  users,
  onToggleGroupPermission,
  onSetGroupSubgroupPermissions,
  onSetGroupCategoryPermissions,
  onApplyPresetToGroup,
  onCreateGroup,
  onDeleteGroup,
  onCreateUser,
  onAssignUserToGroup,
  onDeleteUser,
}) => {
  const [activeTab, setActiveTab] = useState<AccessTab>('groups');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groups[0]?.id ?? ''
  );
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [permSearch, setPermSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [collapsedSubgroups, setCollapsedSubgroups] = useState<
    Record<string, boolean>
  >({});
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<PermissionCategoryId, boolean>
  >({
    orders: false,
    customers: false,
    product_photos: false,
  });

  // Add new Group form state
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPreset, setNewGroupPreset] =
    useState<AccessPresetId>('read_only_viewer');
  const [groupFormError, setGroupFormError] = useState('');

  // Add new User form state
  const [addingUser, setAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserGroupId, setNewUserGroupId] = useState<string>(
    groups[0]?.id ?? ''
  );
  const [userFormError, setUserFormError] = useState('');

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId]
  );

  const totalItems = ALL_PERMISSION_KEYS.length;

  const usersByGroupId = useMemo(() => {
    const map: Record<string, AppUser[]> = {};
    for (const g of groups) {
      map[g.id] = [];
    }
    for (const u of users) {
      if (!map[u.groupId]) map[u.groupId] = [];
      map[u.groupId].push(u);
    }
    return map;
  }, [groups, users]);

  const selectedGroupMembers = selectedGroup
    ? usersByGroupId[selectedGroup.id] ?? []
    : [];

  const usersOutsideSelectedGroup = useMemo(() => {
    if (!selectedGroup) return [];
    return users.filter((u) => u.groupId !== selectedGroup.id);
  }, [users, selectedGroup]);

  const selectedGroupStats = useMemo(() => {
    if (!selectedGroup) {
      return { viewCount: 0, editCount: 0 };
    }
    let viewCount = 0;
    let editCount = 0;
    for (const key of ALL_PERMISSION_KEYS) {
      const p = selectedGroup.permissions[key];
      if (p?.view) viewCount += 1;
      if (p?.view && p?.edit) editCount += 1;
    }
    return { viewCount, editCount };
  }, [selectedGroup]);

  const filteredCategories = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    const baseCategories =
      categoryFilter === 'all'
        ? PERMISSION_CATEGORIES
        : PERMISSION_CATEGORIES.filter((c) => c.id === categoryFilter);

    if (!q) return baseCategories;

    return baseCategories
      .map((cat) => {
        const catMatches =
          cat.title.toLowerCase().includes(q) ||
          cat.description.toLowerCase().includes(q);
        const matchingSubgroups = catMatches
          ? cat.subgroups
          : cat.subgroups
              .map((sg) => {
                const sgMatches =
                  sg.title.toLowerCase().includes(q) ||
                  sg.description.toLowerCase().includes(q);
                const matchingItems = sgMatches
                  ? sg.items
                  : sg.items.filter(
                      (item) =>
                        item.label.toLowerCase().includes(q) ||
                        item.description.toLowerCase().includes(q)
                    );
                return { ...sg, items: matchingItems };
              })
              .filter((sg) => sg.items.length > 0);
        return { ...cat, subgroups: matchingSubgroups };
      })
      .filter((cat) => cat.subgroups.length > 0);
  }, [categoryFilter, permSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const groupName =
        groups.find((g) => g.id === u.groupId)?.name.toLowerCase() ?? '';
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.roleTitle.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        groupName.includes(q)
      );
    });
  }, [users, groups, userSearch]);

  const countGroupPerms = (group: UserGroup) => {
    let view = 0;
    let edit = 0;
    for (const key of ALL_PERMISSION_KEYS) {
      if (group.permissions[key]?.view) view += 1;
      if (group.permissions[key]?.view && group.permissions[key]?.edit) edit += 1;
    }
    return { view, edit };
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setGroupFormError('لطفاً نام گروه کاربری را وارد کنید.');
      return;
    }
    const created = onCreateGroup(newGroupName, newGroupDesc, newGroupPreset);
    setSelectedGroupId(created.id);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupPreset('read_only_viewer');
    setGroupFormError('');
    setAddingGroup(false);
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserRole.trim()) {
      setUserFormError('لطفاً نام کاربر و سمت سازمانی را وارد کنید.');
      return;
    }
    const targetGroupId = groups.some((g) => g.id === newUserGroupId)
      ? newUserGroupId
      : groups[0].id;
    onCreateUser(newUserName, newUserRole, newUserPhone, targetGroupId);
    setNewUserName('');
    setNewUserRole('');
    setNewUserPhone('');
    setUserFormError('');
    setAddingUser(false);
  };

  const toggleSubgroupCollapse = (subgroupId: string) => {
    setCollapsedSubgroups((prev) => ({
      ...prev,
      [subgroupId]: !prev[subgroupId],
    }));
  };

  const toggleCategoryCollapse = (categoryId: PermissionCategoryId) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
      {/* Header */}
      <header className="no-print flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-sm sm:text-[13px] text-slate-500">
          <span className="hidden sm:inline">داشبورد مدیریت</span>
          <ChevronLeft className="hidden sm:inline w-4 h-4 text-slate-400" />
          <h1 className="font-bold text-slate-900 text-base sm:text-[14px]">
            سطح دسترسی و گروه‌های کاربری
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'groups' ? (
            <button
              type="button"
              onClick={() => {
                setAddingGroup((prev) => !prev);
                setGroupFormError('');
              }}
              className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              افزودن گروه کاربری
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNewUserGroupId(selectedGroup?.id ?? groups[0]?.id ?? '');
                setAddingUser((prev) => !prev);
                setUserFormError('');
              }}
              className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              افزودن کاربر جدید
            </button>
          )}
        </div>
      </header>

      {/* Structure Info Notice */}
      <div className="bg-sky-50/80 border border-sky-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs text-sky-950 leading-relaxed">
        <Info className="w-4 h-4 text-[#0f5864] shrink-0 mt-0.5" />
        <span>
          <strong>ساختار ۳ کتگوری سطح دسترسی:</strong> مجوزهای هر گروه کاربری در سه کتگوری مجزا شامل{' '}
          <strong>سفارشات</strong>، <strong>لیست طرف حساب‌ها</strong> و{' '}
          <strong>عکس محصولات</strong> (از جمله مجوز آپلود عکس) تنظیم می‌شود. تغییر مجوز آپلود عکس محصولات برای گروه کاربر فعال به‌صورت زنده در صفحه «عکس محصولات» اعمال می‌گردد.
        </span>
      </div>

      {/* Mode Switcher Tabs: Groups Matrix vs. Users Assignment */}
      <div className="grid grid-cols-2 sm:inline-flex sm:self-start gap-1.5 p-1 bg-slate-200/75 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`min-h-[42px] sm:min-h-0 px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'groups'
              ? 'bg-white text-[#0f5864] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>گروه‌های کاربری ({toPersianDigits(groups.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`min-h-[42px] sm:min-h-0 px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-white text-[#0f5864] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>کاربران و اتصال به گروه ({toPersianDigits(users.length)})</span>
        </button>
      </div>

      {/* ================= TAB 1: USER GROUPS & PERMISSIONS MATRIX ================= */}
      {activeTab === 'groups' && (
        <>
          {/* Inline Create Group Form */}
          {addingGroup && (
            <form
              onSubmit={handleCreateGroupSubmit}
              className="bg-white border border-[#0f5864]/40 rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900 inline-flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0f5864]" />
                  ایجاد گروه کاربری جدید
                </h2>
                <button
                  type="button"
                  onClick={() => setAddingGroup(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                  aria-label="بستن فرم"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    نام گروه کاربری
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => {
                      setNewGroupName(e.target.value);
                      setGroupFormError('');
                    }}
                    placeholder="مثلاً: گروه عکاسی و کاتالوگ محصولات"
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    توضیحات گروه
                  </label>
                  <input
                    type="text"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="مثلاً: دسترسی مشاهده مشتریان و آپلود عکس محصولات"
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    الگوی دسترسی اولیه گروه
                  </label>
                  <select
                    value={newGroupPreset}
                    onChange={(e) =>
                      setNewGroupPreset(e.target.value as AccessPresetId)
                    }
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                  >
                    {(Object.keys(ACCESS_PRESET_LABELS) as AccessPresetId[]).map(
                      (presetId) => (
                        <option key={presetId} value={presetId}>
                          {ACCESS_PRESET_LABELS[presetId]}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {groupFormError && (
                <p className="text-xs text-red-600 font-medium">
                  {groupFormError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingGroup(false)}
                  className="min-h-[40px] px-4 py-2 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ذخیره گروه کاربری
                </button>
              </div>
            </form>
          )}

          {/* Main 2-Column Layout: Groups Directory + 3-Category Permissions Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
            {/* Groups Directory */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#0f5864]" />
                  فهرست گروه‌های کاربری
                </h2>
                <span className="tabular-nums text-[11px] text-slate-500">
                  {toPersianDigits(groups.length)} گروه
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {groups.map((group) => {
                  const isSelected = group.id === selectedGroup?.id;
                  const counts = countGroupPerms(group);
                  const memberCount = (usersByGroupId[group.id] ?? []).length;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full text-right px-4 py-3.5 transition-colors flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5864] ${
                        isSelected
                          ? 'bg-[#0f5864]/8 text-slate-900'
                          : 'bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[13px] font-bold truncate ${
                            isSelected ? 'text-[#0f5864]' : 'text-slate-900'
                          }`}
                        >
                          {group.name}
                        </span>
                        <span className="tabular-nums text-[11px] font-semibold text-slate-500 shrink-0">
                          {toPersianDigits(memberCount)} کاربر
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {group.description}
                      </span>

                      <div className="tabular-nums text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                        <span>
                          مشاهده:{' '}
                          <strong className="text-slate-800">
                            {toPersianDigits(counts.view)}
                          </strong>
                          /{toPersianDigits(totalItems)}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span>
                          ویرایش:{' '}
                          <strong className="text-emerald-700">
                            {toPersianDigits(counts.edit)}
                          </strong>
                          /{toPersianDigits(totalItems)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Selected Group Details & 3 Categories Matrix */}
            {selectedGroup && (
              <section className="flex flex-col gap-4 min-w-0">
                {/* Selected Group Header & Connected Members Strip */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900">
                        {selectedGroup.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {selectedGroup.description}
                      </p>
                      <p className="tabular-nums text-xs text-slate-500 mt-1.5">
                        مجموع مجوزهای گروه در ۳ کتگوری: مشاهده{' '}
                        <strong className="text-[#0f5864]">
                          {toPersianDigits(selectedGroupStats.viewCount)}
                        </strong>{' '}
                        از {toPersianDigits(totalItems)} · ویرایش{' '}
                        <strong className="text-emerald-700">
                          {toPersianDigits(selectedGroupStats.editCount)}
                        </strong>{' '}
                        از {toPersianDigits(totalItems)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <select
                        aria-label="اعمال الگوی آماده به گروه"
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value as AccessPresetId | '';
                          if (val) {
                            onApplyPresetToGroup(selectedGroup.id, val);
                            e.target.value = '';
                          }
                        }}
                        className="h-10 sm:h-9 px-3 text-xs bg-white border border-slate-300 rounded-xl sm:rounded-lg text-slate-700 focus:outline-none focus:border-[#0f5864]"
                      >
                        <option value="" disabled>
                          اعمال الگوی آماده...
                        </option>
                        {(
                          Object.keys(ACCESS_PRESET_LABELS) as AccessPresetId[]
                        ).map((presetId) => (
                          <option key={presetId} value={presetId}>
                            {ACCESS_PRESET_LABELS[presetId]}
                          </option>
                        ))}
                      </select>

                      {!selectedGroup.isSystemGroup && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteGroup(selectedGroup.id);
                            setSelectedGroupId(groups[0].id);
                          }}
                          title="حذف این گروه کاربری"
                          aria-label={`حذف گروه ${selectedGroup.name}`}
                          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl sm:rounded-lg bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Connected Users to This Group */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-slate-700 inline-flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-[#0f5864]" />
                        اعضای متصل به این گروه (
                        {toPersianDigits(selectedGroupMembers.length)}):
                      </span>
                      {selectedGroupMembers.length === 0 ? (
                        <span className="text-slate-400">
                          هنوز کاربری به این گروه متصل نشده است
                        </span>
                      ) : (
                        <span className="text-slate-700 font-medium">
                          {selectedGroupMembers
                            .map((m) => `${m.fullName} (${m.roleTitle})`)
                            .join(' · ')}
                        </span>
                      )}
                    </div>

                    {usersOutsideSelectedGroup.length > 0 && (
                      <select
                        aria-label="اتصال سریع کاربر به این گروه"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onAssignUserToGroup(
                              e.target.value,
                              selectedGroup.id
                            );
                            e.target.value = '';
                          }
                        }}
                        className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-[#0f5864] shrink-0"
                      >
                        <option value="" disabled>
                          + اتصال کاربر به این گروه...
                        </option>
                        {usersOutsideSelectedGroup.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.roleTitle})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Global Category Filter + Search Bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Segmented Category Filter */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter('all')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                          categoryFilter === 'all'
                            ? 'bg-white text-[#0f5864] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        همه کتگوری‌ها ({toPersianDigits(PERMISSION_CATEGORIES.length)})
                      </button>
                      {PERMISSION_CATEGORIES.map((cat) => {
                        const CatIcon = CATEGORY_VISUALS[cat.id].icon;
                        const isActive = categoryFilter === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                              isActive
                                ? 'bg-white text-[#0f5864] shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <CatIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{cat.title}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Search inside Permissions */}
                    <div className="relative flex-1 md:max-w-xs">
                      <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        placeholder="جستجو در مجوزها (آپلود عکس، طرف حساب، فاکتور...)"
                        className="w-full h-10 sm:h-9 pr-9 sm:pr-8 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg focus:outline-none focus:bg-white focus:border-[#0f5864]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#0f5864]" />
                      <span>مشاهده: دیدن بخش یا فیلد</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>ویرایش / اقدام: امکان تغییر یا آپلود (نیازمند مشاهده)</span>
                    </span>
                  </div>
                </div>

                {/* Rendered Categories (سفارشات / لیست طرف حساب‌ها / عکس محصولات) */}
                {filteredCategories.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                    مجوزی با عبارت «{permSearch}» یافت نشد.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredCategories.map((category) => {
                      const visual = CATEGORY_VISUALS[category.id];
                      const CatIcon = visual.icon;
                      const isCategoryCollapsed = Boolean(
                        collapsedCategories[category.id]
                      );

                      const fullCategory = PERMISSION_CATEGORIES.find(
                        (c) => c.id === category.id
                      )!;
                      const allCatItems = fullCategory.subgroups.flatMap(
                        (sg) => sg.items
                      );
                      const catViewCount = allCatItems.filter(
                        (item) => selectedGroup.permissions[item.key]?.view
                      ).length;
                      const catEditCount = allCatItems.filter(
                        (item) =>
                          selectedGroup.permissions[item.key]?.view &&
                          selectedGroup.permissions[item.key]?.edit
                      ).length;
                      const catAllView =
                        allCatItems.length > 0 &&
                        catViewCount === allCatItems.length;
                      const catAllEdit =
                        allCatItems.length > 0 &&
                        catEditCount === allCatItems.length;

                      return (
                        <div
                          key={category.id}
                          className={`bg-white border rounded-xl overflow-hidden ${visual.borderClass}`}
                        >
                          {/* Category Header */}
                          <div
                            className={`px-4 sm:px-5 py-4 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 ${visual.headerBg}`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleCategoryCollapse(category.id)
                              }
                              className="flex items-start gap-2.5 text-right flex-1"
                            >
                              <CatIcon className="w-5 h-5 shrink-0 mt-0.5 text-white/90" />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-medium text-white/75">
                                    کتگوری:
                                  </span>
                                  <h3 className="text-base font-bold">
                                    {category.title}
                                  </h3>
                                  <span className="tabular-nums text-[11px] text-white/80">
                                    (مشاهده {toPersianDigits(catViewCount)}/
                                    {toPersianDigits(allCatItems.length)} ·
                                    ویرایش {toPersianDigits(catEditCount)}/
                                    {toPersianDigits(allCatItems.length)})
                                  </span>
                                  <ChevronDown
                                    className={`w-4 h-4 text-white/80 transition-transform ${
                                      isCategoryCollapsed ? 'rotate-90' : ''
                                    }`}
                                  />
                                </div>
                                <p className="text-xs text-white/85 mt-1 leading-relaxed">
                                  {category.description}
                                </p>
                              </div>
                            </button>

                            {/* Category-Wide Master Toggles */}
                            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4 shrink-0 bg-white/10 rounded-xl px-3.5 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold whitespace-nowrap">
                                  مشاهده کل
                                </span>
                                <ToggleSwitch
                                  checked={catAllView}
                                  label={`مشاهده کل کتگوری ${category.title}`}
                                  variant="view"
                                  onChange={() =>
                                    onSetGroupCategoryPermissions(
                                      selectedGroup.id,
                                      category.id,
                                      'view',
                                      !catAllView
                                    )
                                  }
                                />
                              </div>

                              <div className="hidden sm:block h-5 w-px bg-white/25" />

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold whitespace-nowrap">
                                  ویرایش کل
                                </span>
                                <ToggleSwitch
                                  checked={catAllEdit}
                                  label={`ویرایش کل کتگوری ${category.title}`}
                                  variant="edit"
                                  onChange={() =>
                                    onSetGroupCategoryPermissions(
                                      selectedGroup.id,
                                      category.id,
                                      'edit',
                                      !catAllEdit
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {/* Subgroups & Granular Rows inside Category */}
                          {!isCategoryCollapsed && (
                            <div className="divide-y divide-slate-200">
                              {category.subgroups.map((subgroup) => {
                                const isCollapsed = Boolean(
                                  collapsedSubgroups[subgroup.id]
                                );
                                const subgroupAllView = subgroup.items.every(
                                  (item) =>
                                    selectedGroup.permissions[item.key]?.view
                                );
                                const subgroupAllEdit = subgroup.items.every(
                                  (item) =>
                                    selectedGroup.permissions[item.key]?.view &&
                                    selectedGroup.permissions[item.key]?.edit
                                );
                                const subgroupViewCount = subgroup.items.filter(
                                  (item) =>
                                    selectedGroup.permissions[item.key]?.view
                                ).length;
                                const subgroupEditCount = subgroup.items.filter(
                                  (item) =>
                                    selectedGroup.permissions[item.key]?.view &&
                                    selectedGroup.permissions[item.key]?.edit
                                ).length;

                                return (
                                  <div key={subgroup.id}>
                                    {/* Sub-Group Header */}
                                    <div className="px-4 sm:px-5 py-3 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSubgroupCollapse(subgroup.id)
                                        }
                                        className="flex items-start sm:items-center gap-2 text-right flex-1"
                                      >
                                        <ChevronDown
                                          className={`w-4 h-4 text-slate-500 transition-transform shrink-0 mt-0.5 sm:mt-0 ${
                                            isCollapsed ? 'rotate-90' : ''
                                          }`}
                                        />
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[13px] font-bold text-slate-900">
                                              {subgroup.title}
                                            </span>
                                            <span className="tabular-nums text-[11px] text-slate-500">
                                              ({toPersianDigits(subgroup.items.length)}{' '}
                                              مورد · مشاهده{' '}
                                              {toPersianDigits(subgroupViewCount)}{' '}
                                              · ویرایش{' '}
                                              {toPersianDigits(subgroupEditCount)})
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-slate-500 mt-0.5">
                                            {subgroup.description}
                                          </p>
                                        </div>
                                      </button>

                                      <div className="flex items-center gap-5 shrink-0 pt-1 sm:pt-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-semibold text-slate-600">
                                            همه مشاهده
                                          </span>
                                          <ToggleSwitch
                                            checked={subgroupAllView}
                                            label={`مشاهده همه در ${subgroup.title}`}
                                            variant="view"
                                            onChange={() =>
                                              onSetGroupSubgroupPermissions(
                                                selectedGroup.id,
                                                subgroup.id,
                                                'view',
                                                !subgroupAllView
                                              )
                                            }
                                          />
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-semibold text-slate-600">
                                            همه ویرایش
                                          </span>
                                          <ToggleSwitch
                                            checked={subgroupAllEdit}
                                            label={`ویرایش همه در ${subgroup.title}`}
                                            variant="edit"
                                            onChange={() =>
                                              onSetGroupSubgroupPermissions(
                                                selectedGroup.id,
                                                subgroup.id,
                                                'edit',
                                                !subgroupAllEdit
                                              )
                                            }
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {!isCollapsed && (
                                      <>
                                        {/* Mobile Stacked Rows */}
                                        <div className="sm:hidden divide-y divide-slate-100 border-t border-slate-200">
                                          {subgroup.items.map((item) => {
                                            const perm = selectedGroup
                                              .permissions[item.key] ?? {
                                              view: false,
                                              edit: false,
                                            };
                                            return (
                                              <div
                                                key={item.key}
                                                className="px-4 py-3 space-y-2.5"
                                              >
                                                <div>
                                                  <div className="text-xs font-bold text-slate-900">
                                                    {item.label}
                                                  </div>
                                                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                    {item.description}
                                                  </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-3 pt-1">
                                                  <div className="flex items-center gap-2">
                                                    <ToggleSwitch
                                                      checked={perm.view}
                                                      label={`مجوز مشاهده ${item.label}`}
                                                      variant="view"
                                                      onChange={() =>
                                                        onToggleGroupPermission(
                                                          selectedGroup.id,
                                                          item.key,
                                                          'view'
                                                        )
                                                      }
                                                    />
                                                    <span
                                                      className={`text-[11px] font-semibold ${
                                                        perm.view
                                                          ? 'text-[#0f5864]'
                                                          : 'text-slate-400'
                                                      }`}
                                                    >
                                                      مشاهده:{' '}
                                                      {perm.view
                                                        ? 'مجاز'
                                                        : 'مخفی'}
                                                    </span>
                                                  </div>

                                                  <div className="flex items-center gap-2">
                                                    <ToggleSwitch
                                                      checked={
                                                        perm.view && perm.edit
                                                      }
                                                      disabled={!perm.view}
                                                      label={`مجوز ویرایش ${item.label}`}
                                                      variant="edit"
                                                      onChange={() =>
                                                        onToggleGroupPermission(
                                                          selectedGroup.id,
                                                          item.key,
                                                          'edit'
                                                        )
                                                      }
                                                    />
                                                    <span
                                                      className={`text-[11px] font-semibold ${
                                                        !perm.view
                                                          ? 'text-slate-400'
                                                          : perm.edit
                                                            ? 'text-emerald-700'
                                                            : 'text-amber-700'
                                                      }`}
                                                    >
                                                      {!perm.view
                                                        ? 'غیرفعال'
                                                        : perm.edit
                                                          ? 'مجاز'
                                                          : 'فقط مشاهده'}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Desktop Table */}
                                        <div className="hidden sm:block overflow-x-auto">
                                          <table className="w-full border-collapse text-[13px]">
                                            <thead>
                                              <tr className="border-y border-slate-200 bg-white text-[11px] text-slate-500">
                                                <th className="text-right font-medium px-5 py-2">
                                                  عنصر / فیلد / عملیات در{' '}
                                                  {category.title}
                                                </th>
                                                <th className="text-center font-medium px-4 py-2 w-32">
                                                  مشاهده (دیدن)
                                                </th>
                                                <th className="text-center font-medium px-4 py-2 w-36">
                                                  ویرایش / اقدام
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {subgroup.items.map((item) => {
                                                const perm = selectedGroup
                                                  .permissions[item.key] ?? {
                                                  view: false,
                                                  edit: false,
                                                };

                                                return (
                                                  <tr
                                                    key={item.key}
                                                    className="hover:bg-slate-50/70 transition-colors"
                                                  >
                                                    <td className="px-5 py-3">
                                                      <div className="font-semibold text-slate-900">
                                                        {item.label}
                                                      </div>
                                                      <div className="text-[11px] text-slate-500 mt-0.5">
                                                        {item.description}
                                                      </div>
                                                    </td>

                                                    <td className="px-4 py-3 text-center">
                                                      <div className="inline-flex flex-col items-center gap-1">
                                                        <ToggleSwitch
                                                          checked={perm.view}
                                                          label={`مجوز مشاهده ${item.label}`}
                                                          variant="view"
                                                          onChange={() =>
                                                            onToggleGroupPermission(
                                                              selectedGroup.id,
                                                              item.key,
                                                              'view'
                                                            )
                                                          }
                                                        />
                                                        <span
                                                          className={`text-[10px] font-semibold ${
                                                            perm.view
                                                              ? 'text-[#0f5864]'
                                                              : 'text-slate-400'
                                                          }`}
                                                        >
                                                          {perm.view
                                                            ? 'مجاز'
                                                            : 'مخفی'}
                                                        </span>
                                                      </div>
                                                    </td>

                                                    <td className="px-4 py-3 text-center">
                                                      <div className="inline-flex flex-col items-center gap-1">
                                                        <ToggleSwitch
                                                          checked={
                                                            perm.view &&
                                                            perm.edit
                                                          }
                                                          disabled={!perm.view}
                                                          label={`مجوز ویرایش ${item.label}`}
                                                          title={
                                                            !perm.view
                                                              ? 'برای فعال‌سازی ویرایش/اقدام، ابتدا مجوز مشاهده را روشن کنید'
                                                              : undefined
                                                          }
                                                          variant="edit"
                                                          onChange={() =>
                                                            onToggleGroupPermission(
                                                              selectedGroup.id,
                                                              item.key,
                                                              'edit'
                                                            )
                                                          }
                                                        />
                                                        <span
                                                          className={`text-[10px] font-semibold ${
                                                            !perm.view
                                                              ? 'text-slate-400'
                                                              : perm.edit
                                                                ? 'text-emerald-700'
                                                                : 'text-amber-700'
                                                          }`}
                                                        >
                                                          {!perm.view
                                                            ? 'غیرفعال'
                                                            : perm.edit
                                                              ? 'قابل اجرا'
                                                              : 'فقط مشاهده'}
                                                        </span>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}

      {/* ================= TAB 2: USERS & GROUP ASSIGNMENT ================= */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-4">
          {/* Inline Create User Form */}
          {addingUser && (
            <form
              onSubmit={handleCreateUserSubmit}
              className="bg-white border border-[#0f5864]/40 rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900 inline-flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#0f5864]" />
                  افزودن کاربر جدید و اتصال به گروه کاربری
                </h2>
                <button
                  type="button"
                  onClick={() => setAddingUser(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                  aria-label="بستن فرم"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    نام و نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => {
                      setNewUserName(e.target.value);
                      setUserFormError('');
                    }}
                    placeholder="مثلاً: محمد نادری"
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    سمت / عنوان شغلی
                  </label>
                  <input
                    type="text"
                    value={newUserRole}
                    onChange={(e) => {
                      setNewUserRole(e.target.value);
                      setUserFormError('');
                    }}
                    placeholder="مثلاً: راننده پخش غرب"
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شماره موبایل
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="0912-000-0000"
                    className="tabular-nums w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    اتصال به گروه کاربری
                  </label>
                  <select
                    value={newUserGroupId}
                    onChange={(e) => setNewUserGroupId(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {userFormError && (
                <p className="text-xs text-red-600 font-medium">
                  {userFormError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingUser(false)}
                  className="min-h-[40px] px-4 py-2 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ثبت کاربر و اتصال به گروه
                </button>
              </div>
            </form>
          )}

          {/* Users Table / Mobile Cards */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  فهرست کاربران و گروه کاربری متصل
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  سطح دسترسی هر کاربر در هر سه کتگوری از طریق گروه کاربری متصل به آن تعیین می‌شود.
                </p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="جستجو نام کاربر یا گروه..."
                  className="w-full sm:w-60 h-10 sm:h-9 pr-9 sm:pr-8 pl-3 text-xs bg-white border border-slate-200 rounded-xl sm:rounded-lg focus:outline-none focus:border-[#0f5864]"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const assignedGroup =
                  groups.find((g) => g.id === user.groupId) ?? groups[0];
                const counts = assignedGroup
                  ? countGroupPerms(assignedGroup)
                  : { view: 0, edit: 0 };
                const canUploadPhotos = Boolean(
                  assignedGroup?.permissions.action_product_photos_upload
                    ?.view &&
                    assignedGroup?.permissions.action_product_photos_upload
                      ?.edit
                );

                return (
                  <div
                    key={user.id}
                    className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {user.fullName}
                        </span>
                        <span
                          className="text-xs text-slate-400"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                        <span className="text-xs text-slate-600">
                          {user.roleTitle}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 tabular-nums">
                        <span dir="ltr">{user.phone}</span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span>
                          دسترسی کل: مشاهده {toPersianDigits(counts.view)} /
                          ویرایش {toPersianDigits(counts.edit)}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span
                          className={
                            canUploadPhotos
                              ? 'text-emerald-700 font-semibold'
                              : 'text-slate-400'
                          }
                        >
                          آپلود عکس: {canUploadPhotos ? 'مجاز' : 'غیرمجاز'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2 flex-1 sm:flex-none">
                        <label
                          htmlFor={`user-group-${user.id}`}
                          className="text-xs font-medium text-slate-600 whitespace-nowrap"
                        >
                          گروه کاربری:
                        </label>
                        <select
                          id={`user-group-${user.id}`}
                          value={user.groupId}
                          onChange={(e) =>
                            onAssignUserToGroup(user.id, e.target.value)
                          }
                          className="flex-1 sm:w-48 h-10 sm:h-9 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-xl sm:rounded-lg text-slate-900 focus:outline-none focus:border-[#0f5864]"
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (assignedGroup) {
                            setSelectedGroupId(assignedGroup.id);
                            setActiveTab('groups');
                          }
                        }}
                        className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl sm:rounded-lg text-xs font-semibold text-[#0f5864] bg-[#0f5864]/8 hover:bg-[#0f5864]/15 transition-colors whitespace-nowrap inline-flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        مجوزهای گروه
                      </button>

                      {!user.isSystemAdmin && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(user.id)}
                          title="حذف کاربر"
                          aria-label={`حذف کاربر ${user.fullName}`}
                          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl sm:rounded-lg bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
