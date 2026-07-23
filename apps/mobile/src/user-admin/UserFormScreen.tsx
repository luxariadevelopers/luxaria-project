import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
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
      {loading ? (
        <AsyncStatePanel
          loading
          error={error}
          onRetry={() => void load()}
        />
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FormSection title="Login">
            <TextField
              label="Full name *"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <TextField
              label="Email (login)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label="Mobile (login)"
              value={mobile}
              onChangeText={setMobile}
              autoCapitalize="none"
              keyboardType="phone-pad"
            />

            {mode === 'create' ? (
              <>
                <TextField
                  label="Initial temporary password *"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>
                  Share securely. They must set a permanent password on first
                  login.
                </Text>
                <Text style={styles.label}>Initial status</Text>
                <View style={styles.chips}>
                  {[UserStatus.Active, UserStatus.Inactive].map((value) => (
                    <Chip
                      key={value}
                      label={value}
                      selected={status === value}
                      onPress={() => setStatus(value)}
                    />
                  ))}
                </View>
              </>
            ) : (
              <TextField
                label="Set / reset temporary password"
                value={temporaryPassword}
                onChangeText={setTemporaryPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Leave blank to keep current"
              />
            )}
          </FormSection>

          <FormSection
            title="Employment"
            description={
              lockedEmployeeId
                ? 'Employee ID is assigned and locked'
                : employeeIdDisplay
                  ? 'Final number is assigned when you save (DEPT-DESIG-######)'
                  : 'Choose department and designation to preview'
            }
          >
            <TextField
              label="Employee ID"
              value={employeeIdDisplay}
              editable={false}
              placeholder="Select department & designation"
            />

            <Text style={styles.label}>Department</Text>
            <View style={styles.chips}>
              {USER_DEPARTMENT_NAMES.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  selected={department === name}
                  onPress={() => setDepartment(name === department ? '' : name)}
                />
              ))}
            </View>

            <Text style={styles.label}>
              {department.trim()
                ? 'Designation'
                : 'Designation (select department first)'}
            </Text>
            <View style={styles.chips}>
              {designations.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  selected={designation === name}
                  onPress={() =>
                    setDesignation(name === designation ? '' : name)
                  }
                />
              ))}
            </View>

            <TextField
              label="Joining date (YYYY-MM-DD)"
              value={joiningDate}
              onChangeText={setJoiningDate}
              autoCapitalize="none"
              placeholder="2026-01-15"
            />
          </FormSection>

          <FormSection
            title="Reporting & approvals"
            description="Optional. Leave empty for top-level roles."
          >
            <View style={styles.chips}>
              {managers.map((manager) => {
                const selected = reportingOfficers.includes(manager.id);
                return (
                  <Chip
                    key={manager.id}
                    label={`${manager.fullName} · ${manager.userCode}`}
                    selected={selected}
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
                  />
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
                      <Chip
                        key={id}
                        label={manager?.fullName ?? id}
                        selected={reportingManager === id}
                        onPress={() => setReportingManager(id)}
                      />
                    );
                  })}
                </View>
                <Text style={styles.label}>Approval rule</Text>
                <View style={styles.chips}>
                  <Chip
                    label="Any one can approve"
                    selected={
                      reportingApprovalMode === ReportingApprovalMode.Any
                    }
                    onPress={() =>
                      setReportingApprovalMode(ReportingApprovalMode.Any)
                    }
                  />
                  <Chip
                    label="All must approve"
                    selected={
                      reportingApprovalMode === ReportingApprovalMode.All
                    }
                    onPress={() =>
                      setReportingApprovalMode(ReportingApprovalMode.All)
                    }
                  />
                </View>
              </>
            ) : null}
          </FormSection>

          {allowRoleAssignment ? (
            <FormSection title="Initial roles">
              <View style={styles.chips}>
                {roles.map((role) => {
                  const selected = roleIds.includes(role.id);
                  return (
                    <Chip
                      key={role.id}
                      label={`${role.name} · ${role.code}`}
                      selected={selected}
                      onPress={() =>
                        setRoleIds((prev) =>
                          selected
                            ? prev.filter((id) => id !== role.id)
                            : [...prev, role.id],
                        )
                      }
                    />
                  );
                })}
              </View>
            </FormSection>
          ) : null}

          {allowProjectAssignment ? (
            <FormSection title="Initial projects">
              <View style={styles.chips}>
                {projects.map((project) => {
                  const selected = assignedProjects.includes(project.id);
                  return (
                    <Chip
                      key={project.id}
                      label={`${project.projectCode} · ${project.projectName}`}
                      selected={selected}
                      onPress={() =>
                        setAssignedProjects((prev) =>
                          selected
                            ? prev.filter((id) => id !== project.id)
                            : [...prev, project.id],
                        )
                      }
                    />
                  );
                })}
              </View>
            </FormSection>
          ) : null}

          <Button
            label={mode === 'create' ? 'Create user' : 'Save changes'}
            loading={saving}
            disabled={saving || loading}
            onPress={() => void submit()}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.sm },
  hint: {
    ...typography.meta,
    fontSize: 12,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
