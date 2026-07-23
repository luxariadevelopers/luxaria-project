import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
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
          <Pressable
            style={styles.newBtn}
            onPress={() =>
              navigation.navigate('UserForm', { userId: user.id })
            }
          >
            <Text style={styles.newBtnText}>Edit</Text>
          </Pressable>
        ) : null
      }
    >
      {loading || error || forbidden || !user ? (
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

          <View style={styles.card}>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.row}>Status: {user.status}</Text>
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
          </View>

          <View style={styles.actions}>
            {user.status === UserStatus.Active && caps.canDeactivate ? (
              <Pressable
                style={[styles.actionBtn, styles.warnBtn]}
                disabled={acting}
                onPress={() => runStatus('deactivate')}
              >
                <Text style={styles.actionText}>Deactivate</Text>
              </Pressable>
            ) : null}
            {user.status !== UserStatus.Active && caps.canActivate ? (
              <Pressable
                style={styles.actionBtn}
                disabled={acting}
                onPress={() => runStatus('activate')}
              >
                <Text style={styles.actionText}>Activate</Text>
              </Pressable>
            ) : null}
            {caps.canResetPassword ? (
              <Pressable
                style={[styles.actionBtn, styles.warnBtn]}
                disabled={acting}
                onPress={() => setShowReset((v) => !v)}
              >
                <Text style={styles.actionText}>Reset password</Text>
              </Pressable>
            ) : null}
          </View>

          {showReset ? (
            <View style={styles.card}>
              <Text style={styles.section}>Temporary password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Min 8 characters"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable
                style={[styles.actionBtn, acting && styles.disabled]}
                disabled={acting}
                onPress={() => void submitPasswordReset()}
              >
                <Text style={styles.actionText}>
                  {acting ? 'Resetting…' : 'Confirm reset'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.section}>Roles</Text>
            {caps.canAssignRole && roles.length > 0 ? (
              <>
                <View style={styles.chips}>
                  {roles.map((role) => {
                    const selected = selectedRoleIds.includes(role.id);
                    return (
                      <Pressable
                        key={role.id}
                        style={[styles.chip, selected && styles.chipActive]}
                        onPress={() =>
                          setSelectedRoleIds((prev) =>
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
                <Pressable
                  style={[styles.actionBtn, acting && styles.disabled]}
                  disabled={acting}
                  onPress={() => void saveRoles()}
                >
                  <Text style={styles.actionText}>Save roles</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.row}>
                {user.roleIds.length
                  ? user.roleIds.map(roleName).join(', ')
                  : 'No roles assigned'}
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Projects</Text>
            {caps.canAssignProject && projects.length > 0 ? (
              <View style={styles.chips}>
                {projects.map((project) => {
                  const assigned = user.assignedProjects.includes(project.id);
                  return (
                    <Pressable
                      key={project.id}
                      style={[styles.chip, assigned && styles.chipActive]}
                      disabled={acting}
                      onPress={() => void toggleProject(project.id, assigned)}
                    >
                      <Text style={styles.chipText}>
                        {assigned ? '✓ ' : ''}
                        {project.projectCode}
                      </Text>
                    </Pressable>
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
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12, paddingBottom: 24 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
  name: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  section: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  row: { color: colors.text, fontSize: 15 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warnBtn: { backgroundColor: '#9A3412' },
  actionText: { color: '#F4F0E6', fontWeight: '700' },
  newBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: { color: '#F4F0E6', fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  disabled: { opacity: 0.6 },
  error: { color: '#B42318', marginBottom: 4 },
});
