import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  createUser,
  fetchUser,
  fetchUsers,
  listProjectsForAdmin,
  listRolesForAdmin,
  updateUser,
} from './api';
import {
  USER_DEPARTMENT_NAMES,
  USER_DESIGNATIONS_BY_DEPARTMENT,
  previewEmployeeId,
} from './employmentOptions';
import { resolveUserAdminCapabilities } from './permissions';
import {
  ReportingApprovalMode,
  UserStatus,
  type ProjectOption,
  type PublicUser,
  type RoleOption,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'UserForm'>;

function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function UserFormScreen({ navigation, route }: Props) {
  const userId = route.params?.userId;
  const mode = userId ? 'edit' : 'create';
  const { hasPermission } = useAuth();
  const caps = resolveUserAdminCapabilities(hasPermission);
  const { isOnline } = useNetwork();

  const allowRoleAssignment =
    caps.canAssignRole && hasPermission('role.view') && mode === 'create';
  const allowProjectAssignment =
    caps.canAssignProject && hasPermission('project.view') && mode === 'create';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [status, setStatus] = useState<UserStatus>(UserStatus.Active);
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [reportingOfficers, setReportingOfficers] = useState<string[]>([]);
  const [reportingManager, setReportingManager] = useState('');
  const [reportingApprovalMode, setReportingApprovalMode] =
    useState<ReportingApprovalMode>(ReportingApprovalMode.Any);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<string[]>([]);
  const [lockedEmployeeId, setLockedEmployeeId] = useState<string | null>(null);

  const [managers, setManagers] = useState<PublicUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canOpen =
    mode === 'create' ? caps.canCreate : caps.canView && caps.canUpdate;

  const designations = useMemo(() => {
    if (!department.trim()) return [] as readonly string[];
    return USER_DESIGNATIONS_BY_DEPARTMENT[department] ?? [];
  }, [department]);

  // Web keeps Employee ID display-only; server assigns DEPT-DESIG-######.
  const employeeIdDisplay = useMemo(() => {
    if (mode === 'edit' && lockedEmployeeId) return lockedEmployeeId;
    return previewEmployeeId(department, designation);
  }, [mode, lockedEmployeeId, department, designation]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    if (!isOnline) {
      setError('Go online to manage users');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const managerPromise = caps.canView
        ? fetchUsers({
            page: 1,
            limit: 100,
            status: UserStatus.Active,
            sortBy: 'fullName',
            sortOrder: 'asc',
          }).then((r) => r.items)
        : Promise.resolve([] as PublicUser[]);

      const rolePromise = allowRoleAssignment
        ? listRolesForAdmin({ status: 'active' })
        : Promise.resolve([] as RoleOption[]);

      const projectPromise = allowProjectAssignment
        ? listProjectsForAdmin()
        : Promise.resolve([] as ProjectOption[]);

      const userPromise =
        mode === 'edit' && userId
          ? fetchUser(userId)
          : Promise.resolve(null as PublicUser | null);

      const [managerItems, roleItems, projectItems, user] = await Promise.all([
        managerPromise,
        rolePromise,
        projectPromise,
        userPromise,
      ]);

      setManagers(managerItems.filter((u) => u.id !== userId));
      setRoles(roleItems);
      setProjects(projectItems);

      if (user) {
        setFullName(user.fullName);
        setEmail(user.email ?? '');
        setMobile(user.mobile ?? '');
        setStatus(
          user.status === UserStatus.Inactive
            ? UserStatus.Inactive
            : UserStatus.Active,
        );
        setDepartment(user.department ?? '');
        setDesignation(user.designation ?? '');
        setJoiningDate(user.joiningDate?.slice(0, 10) ?? '');
        const officers =
          user.reportingOfficers.length > 0
            ? user.reportingOfficers
            : user.reportingManager
              ? [user.reportingManager]
              : [];
        setReportingOfficers(officers);
        setReportingManager(user.reportingManager ?? officers[0] ?? '');
        setReportingApprovalMode(
          user.reportingApprovalMode === ReportingApprovalMode.All
            ? ReportingApprovalMode.All
            : ReportingApprovalMode.Any,
        );
        setLockedEmployeeId(user.employeeId);
        setRoleIds(user.roleIds);
        setAssignedProjects(user.assignedProjects);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load form data'));
    } finally {
      setLoading(false);
    }
  }, [
    allowProjectAssignment,
    allowRoleAssignment,
    canOpen,
    caps.canView,
    isOnline,
    mode,
    userId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!department.trim() || !designation.trim()) return;
    if (!designations.includes(designation)) {
      setDesignation('');
    }
  }, [department, designation, designations]);

  if (!canOpen) {
    return (
      <Screen
        title={mode === 'create' ? 'Create user' : 'Edit user'}
        subtitle="Permission required"
      >
        <Text style={styles.error}>
          {mode === 'create'
            ? 'You need user.create.'
            : 'You need user.view and user.update.'}
        </Text>
      </Screen>
    );
  }

  const submit = async () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!email.trim() && !mobile.trim()) {
      setError('Email or mobile is required for login');
      return;
    }
    if (mode === 'create' && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (
      mode === 'edit' &&
      temporaryPassword.trim() &&
      temporaryPassword.trim().length < 8
    ) {
      setError('Temporary password must be at least 8 characters');
      return;
    }
    if (!isOnline) {
      setError('Go online to save users');
      return;
    }

    const officers = [...new Set(reportingOfficers.filter(Boolean))];
    const primary = reportingManager.trim() || officers[0] || null;

    setSaving(true);
    setError(null);
    try {
      if (mode === 'create') {
        const created = await createUser({
          fullName: fullName.trim(),
          email: optionalString(email),
          mobile: optionalString(mobile),
          password,
          department: optionalString(department),
          designation: optionalString(designation),
          joiningDate: optionalString(joiningDate),
          status,
          reportingManager: primary,
          reportingOfficers: officers,
          reportingApprovalMode,
          ...(allowRoleAssignment ? { roleIds } : {}),
          ...(allowProjectAssignment ? { assignedProjects } : {}),
        });
        Alert.alert('Created', created.userCode);
        if (caps.canView) {
          navigation.replace('UserDetail', { userId: created.id });
        } else {
          navigation.goBack();
        }
      } else if (userId) {
        const updated = await updateUser(userId, {
          fullName: fullName.trim(),
          email: optionalString(email),
          mobile: optionalString(mobile),
          department: optionalString(department),
          designation: optionalString(designation),
          joiningDate: optionalString(joiningDate),
          reportingManager: primary,
          reportingOfficers: officers,
          reportingApprovalMode,
          ...(temporaryPassword.trim()
            ? { temporaryPassword: temporaryPassword.trim() }
            : {}),
        });
        Alert.alert('Saved', updated.userCode);
        navigation.replace('UserDetail', { userId: updated.id });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save user'));
    } finally {
      setSaving(false);
      setPassword('');
      setTemporaryPassword('');
    }
  };

  return (
    <Screen
      title={mode === 'create' ? 'Create user' : 'Edit user'}
      subtitle={
        loading
          ? 'Loading…'
          : mode === 'edit'
            ? 'Update profile & employment'
            : 'Email or mobile is the login ID'
      }
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Full name *</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Email (login)</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Mobile (login)</Text>
      <TextInput
        style={styles.input}
        value={mobile}
        onChangeText={setMobile}
        autoCapitalize="none"
        keyboardType="phone-pad"
      />

      {mode === 'create' ? (
        <>
          <Text style={styles.label}>Initial temporary password *</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Share securely. They must set a permanent password on first login.
          </Text>
          <Text style={styles.label}>Initial status</Text>
          <View style={styles.chips}>
            {[UserStatus.Active, UserStatus.Inactive].map((value) => (
              <Pressable
                key={value}
                style={[styles.chip, status === value && styles.chipActive]}
                onPress={() => setStatus(value)}
              >
                <Text style={styles.chipText}>{value}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>Set / reset temporary password</Text>
          <TextInput
            style={styles.input}
            value={temporaryPassword}
            onChangeText={setTemporaryPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Leave blank to keep current"
            placeholderTextColor={colors.textMuted}
          />
        </>
      )}

      <Text style={styles.section}>Employment</Text>
      <Text style={styles.label}>Employee ID</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled]}
        value={employeeIdDisplay}
        editable={false}
        placeholder="Select department & designation"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.hint}>
        {lockedEmployeeId
          ? 'Assigned and locked'
          : employeeIdDisplay
            ? 'Final number is assigned when you save (DEPT-DESIG-######)'
            : 'Choose department and designation to preview'}
      </Text>

      <Text style={styles.label}>Department</Text>
      <View style={styles.chips}>
        {USER_DEPARTMENT_NAMES.map((name) => (
          <Pressable
            key={name}
            style={[styles.chip, department === name && styles.chipActive]}
            onPress={() => setDepartment(name === department ? '' : name)}
          >
            <Text style={styles.chipText}>{name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>
        {department.trim()
          ? 'Designation'
          : 'Designation (select department first)'}
      </Text>
      <View style={styles.chips}>
        {designations.map((name) => (
          <Pressable
            key={name}
            style={[styles.chip, designation === name && styles.chipActive]}
            onPress={() => setDesignation(name === designation ? '' : name)}
          >
            <Text style={styles.chipText}>{name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Joining date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={joiningDate}
        onChangeText={setJoiningDate}
        autoCapitalize="none"
        placeholder="2026-01-15"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.section}>Reporting & approvals</Text>
      <Text style={styles.hint}>
        Optional. Leave empty for top-level roles.
      </Text>
      <View style={styles.chips}>
        {managers.map((manager) => {
          const selected = reportingOfficers.includes(manager.id);
          return (
            <Pressable
              key={manager.id}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => {
                setReportingOfficers((prev) => {
                  const next = selected
                    ? prev.filter((id) => id !== manager.id)
                    : [...prev, manager.id];
                  if (!next.length) {
                    setReportingManager('');
                  } else if (!next.includes(reportingManager)) {
                    setReportingManager(next[0] ?? '');
                  }
                  return next;
                });
              }}
            >
              <Text style={styles.chipText}>
                {manager.fullName} · {manager.userCode}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {reportingOfficers.length > 0 ? (
        <>
          <Text style={styles.label}>Primary reporting officer</Text>
          <View style={styles.chips}>
            {reportingOfficers.map((id) => {
              const manager = managers.find((m) => m.id === id);
              return (
                <Pressable
                  key={id}
                  style={[
                    styles.chip,
                    reportingManager === id && styles.chipActive,
                  ]}
                  onPress={() => setReportingManager(id)}
                >
                  <Text style={styles.chipText}>
                    {manager?.fullName ?? id}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>Approval rule</Text>
          <View style={styles.chips}>
            <Pressable
              style={[
                styles.chip,
                reportingApprovalMode === ReportingApprovalMode.Any &&
                  styles.chipActive,
              ]}
              onPress={() => setReportingApprovalMode(ReportingApprovalMode.Any)}
            >
              <Text style={styles.chipText}>Any one can approve</Text>
            </Pressable>
            <Pressable
              style={[
                styles.chip,
                reportingApprovalMode === ReportingApprovalMode.All &&
                  styles.chipActive,
              ]}
              onPress={() => setReportingApprovalMode(ReportingApprovalMode.All)}
            >
              <Text style={styles.chipText}>All must approve</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {allowRoleAssignment ? (
        <>
          <Text style={styles.section}>Initial roles</Text>
          <View style={styles.chips}>
            {roles.map((role) => {
              const selected = roleIds.includes(role.id);
              return (
                <Pressable
                  key={role.id}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() =>
                    setRoleIds((prev) =>
                      selected
                        ? prev.filter((id) => id !== role.id)
                        : [...prev, role.id],
                    )
                  }
                >
                  <Text style={styles.chipText}>
                    {role.name} · {role.code}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {allowProjectAssignment ? (
        <>
          <Text style={styles.section}>Initial projects</Text>
          <View style={styles.chips}>
            {projects.map((project) => {
              const selected = assignedProjects.includes(project.id);
              return (
                <Pressable
                  key={project.id}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() =>
                    setAssignedProjects((prev) =>
                      selected
                        ? prev.filter((id) => id !== project.id)
                        : [...prev, project.id],
                    )
                  }
                >
                  <Text style={styles.chipText}>
                    {project.projectCode} · {project.projectName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Pressable
        style={[styles.submit, (saving || loading) && styles.disabled]}
        disabled={saving || loading}
        onPress={() => void submit()}
      >
        <Text style={styles.submitText}>
          {saving
            ? 'Saving…'
            : mode === 'create'
              ? 'Create user'
              : 'Save changes'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  section: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabled: { opacity: 0.7 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  submit: {
    marginTop: 24,
    marginBottom: 32,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: '#B42318', marginBottom: 8 },
});
