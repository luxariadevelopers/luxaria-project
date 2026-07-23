import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
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
  activateUser,
  assignUserProjects,
  deactivateUser,
  fetchUser,
  listProjectsForAdmin,
  listRolesForAdmin,
  removeUserProjects,
  replaceUserRoles,
  resetUserPassword,
} from './api';
import { resolveUserAdminCapabilities } from './permissions';
import {
  UserStatus,
  type ProjectOption,
  type PublicUser,
  type RoleOption,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'UserDetail'>;

export function UserDetailScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolveUserAdminCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const canEdit = caps.canView && caps.canUpdate;
  const canLoadRoles = caps.canAssignRole && hasPermission('role.view');
  const canLoadProjects =
    caps.canAssignProject && hasPermission('project.view');

  const load = useCallback(async () => {
    if (!caps.canView) {
      setForbidden(true);
      setError('Missing user.view');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to open user');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchUser(userId);
      setUser(next);
      setSelectedRoleIds(next.roleIds);
      setError(null);
      setForbidden(false);

      const lookups: Promise<void>[] = [];
      if (canLoadRoles) {
        lookups.push(
          listRolesForAdmin({ status: 'active' }).then(setRoles).catch(() => {
            setRoles([]);
          }),
        );
      }
      if (canLoadProjects) {
        lookups.push(
          listProjectsForAdmin()
            .then(setProjects)
            .catch(() => {
              setProjects([]);
            }),
        );
      }
      if (lookups.length) await Promise.all(lookups);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load user'));
    } finally {
      setLoading(false);
    }
  }, [canLoadProjects, canLoadRoles, caps.canView, isOnline, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const runStatus = (action: 'activate' | 'deactivate') => {
    if (!user) return;
    Alert.alert(
      action === 'deactivate'
        ? `Deactivate ${user.fullName}?`
        : `Activate ${user.fullName}?`,
      action === 'deactivate'
        ? 'Login will be blocked and active sessions revoked.'
        : 'Login will be enabled and any lock state cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'deactivate' ? 'Deactivate' : 'Activate',
          style: action === 'deactivate' ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              setActing(true);
              setError(null);
              try {
                const next =
                  action === 'activate'
                    ? await activateUser(user.id)
                    : await deactivateUser(user.id);
                setUser(next);
                Alert.alert(
                  'Done',
                  action === 'activate'
                    ? 'User activated'
                    : 'User deactivated',
                );
              } catch (err) {
                setError(getErrorMessage(err, 'Status change failed'));
              } finally {
                setActing(false);
              }
            })();
          },
        },
      ],
    );
  };

  const submitPasswordReset = async () => {
    if (!user) return;
    if (newPassword.trim().length < 8) {
      setError('Temporary password must be at least 8 characters');
      return;
    }
    setActing(true);
    setError(null);
    try {
      await resetUserPassword(user.id, newPassword.trim());
      setNewPassword('');
      setShowReset(false);
      Alert.alert('Password reset', 'Active sessions were revoked');
    } catch (err) {
      setError(getErrorMessage(err, 'Password reset failed'));
    } finally {
      setActing(false);
    }
  };

  const saveRoles = async () => {
    if (!user) return;
    setActing(true);
    setError(null);
    try {
      const next = await replaceUserRoles(user.id, selectedRoleIds);
      setUser(next);
      Alert.alert('Roles updated', 'Role list replaced');
    } catch (err) {
      setError(getErrorMessage(err, 'Role assignment failed'));
    } finally {
      setActing(false);
    }
  };

  const toggleProject = async (projectId: string, assigned: boolean) => {
    if (!user) return;
    setActing(true);
    setError(null);
    try {
      const next = assigned
        ? await removeUserProjects(user.id, [projectId])
        : await assignUserProjects(user.id, [projectId]);
      setUser(next);
    } catch (err) {
      setError(getErrorMessage(err, 'Project assignment failed'));
    } finally {
      setActing(false);
    }
  };

  const roleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? `${role.name} · ${role.code}` : roleId;
  };

  const projectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project
      ? `${project.projectName} · ${project.projectCode}`
      : projectId;
  };

  return (
    <Screen
      title="User"
      subtitle={user?.userCode ?? userId}
      rightSlot={
        canEdit && user ? (
          <Button
            label="Edit"
            onPress={() =>
              navigation.navigate('UserForm', { userId: user.id })
            }
            style={{ minWidth: 80 }}
          />
        ) : null
      }
    >
      {loading || (error && !user) || forbidden || !user ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !user}
          emptyLabel="User not found"
          onRetry={() => void load()}
        />
      ) : (
        <View style={styles.stack}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FormSection title={user.fullName} description={user.status}>
            <Text style={styles.row}>Email: {user.email ?? '—'}</Text>
            <Text style={styles.row}>Mobile: {user.mobile ?? '—'}</Text>
            <Text style={styles.row}>
              Employee ID: {user.employeeId ?? '—'}
            </Text>
            <Text style={styles.row}>
              Department: {user.department ?? '—'}
            </Text>
            <Text style={styles.row}>
              Designation: {user.designation ?? '—'}
            </Text>
            <Text style={styles.row}>
              Joining: {user.joiningDate?.slice(0, 10) ?? '—'}
            </Text>
            <Text style={styles.row}>
              Last login: {user.lastLoginAt?.slice(0, 16) ?? '—'}
            </Text>
          </FormSection>

          <FormSection title="Actions" framed={false}>
            <View style={styles.actions}>
              {user.status === UserStatus.Active && caps.canDeactivate ? (
                <Button
                  label="Deactivate"
                  variant="danger"
                  disabled={acting}
                  onPress={() => runStatus('deactivate')}
                />
              ) : null}
              {user.status !== UserStatus.Active && caps.canActivate ? (
                <Button
                  label="Activate"
                  disabled={acting}
                  onPress={() => runStatus('activate')}
                />
              ) : null}
              {caps.canResetPassword ? (
                <Button
                  label="Reset password"
                  variant="secondary"
                  disabled={acting}
                  onPress={() => setShowReset((v) => !v)}
                />
              ) : null}
            </View>
          </FormSection>

          {showReset ? (
            <FormSection title="Temporary password">
              <TextField
                label="Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Min 8 characters"
              />
              <Button
                label="Confirm reset"
                loading={acting}
                disabled={acting}
                onPress={() => void submitPasswordReset()}
              />
            </FormSection>
          ) : null}

          <FormSection title="Roles">
            {caps.canAssignRole && roles.length > 0 ? (
              <>
                <View style={styles.chips}>
                  {roles.map((role) => {
                    const selected = selectedRoleIds.includes(role.id);
                    return (
                      <Chip
                        key={role.id}
                        label={`${role.name} · ${role.code}`}
                        selected={selected}
                        onPress={() =>
                          setSelectedRoleIds((prev) =>
                            selected
                              ? prev.filter((id) => id !== role.id)
                              : [...prev, role.id],
                          )
                        }
                      />
                    );
                  })}
                </View>
                <Button
                  label="Save roles"
                  loading={acting}
                  disabled={acting}
                  onPress={() => void saveRoles()}
                />
              </>
            ) : (
              <Text style={styles.row}>
                {user.roleIds.length
                  ? user.roleIds.map(roleName).join(', ')
                  : 'No roles assigned'}
              </Text>
            )}
          </FormSection>

          <FormSection title="Projects">
            {caps.canAssignProject && projects.length > 0 ? (
              <View style={styles.chips}>
                {projects.map((project) => {
                  const assigned = user.assignedProjects.includes(project.id);
                  return (
                    <Chip
                      key={project.id}
                      label={`${assigned ? '✓ ' : ''}${project.projectCode}`}
                      selected={assigned}
                      disabled={acting}
                      onPress={() => void toggleProject(project.id, assigned)}
                    />
                  );
                })}
              </View>
            ) : (
              <Text style={styles.row}>
                {user.assignedProjects.length
                  ? user.assignedProjects.map(projectName).join(', ')
                  : 'No projects assigned'}
              </Text>
            )}
          </FormSection>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md, paddingBottom: spacing.xxxl },
  row: { ...typography.body, fontSize: 15, marginBottom: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, marginBottom: spacing.xs },
});
