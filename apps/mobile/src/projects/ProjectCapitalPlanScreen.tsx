import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
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
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  applyEqualDirectorCommitments,
  loadCapitalPlanDefaults,
  num,
  syncCapitalPlanFromForm,
} from './capitalPlan';
import {
  fetchDirectorOptions,
  fetchInvestorOptions,
  fetchProject,
  updateProject,
} from './projectApi';
import type {
  CapitalDirectorRow,
  CapitalInvestorRow,
  PartyOption,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'ProjectCapitalPlan'>;

function emptyDirector(): CapitalDirectorRow {
  return { directorId: '', profitSharePercent: '', commitmentAmount: '' };
}

function emptyInvestor(): CapitalInvestorRow {
  return {
    investorId: '',
    budgetInvestmentPercentage: '',
    commitmentAmount: '',
    profitSharePercent: '',
    instrumentType: 'project_investment',
    repaymentMode: '',
    interestRate: '',
  };
}

export function ProjectCapitalPlanScreen(_props: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject, selectedProjectId } = useProject();
  const { isOnline } = useNetwork();

  const canUpdateProject = hasPermission('project.update');
  const canSyncParticipants =
    hasPermission('project_participant.create') ||
    hasPermission('project_participant.update');
  const canEdit = canUpdateProject || canSyncParticipants;
  const canViewDirectors = hasPermission('director.view');
  const canViewInvestors = hasPermission('investor.view');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [approvedBudget, setApprovedBudget] = useState('');
  const [equalDirectorInvestment, setEqualDirectorInvestment] = useState(false);
  const [directors, setDirectors] = useState<CapitalDirectorRow[]>([]);
  const [investors, setInvestors] = useState<CapitalInvestorRow[]>([]);
  const [directorOptions, setDirectorOptions] = useState<PartyOption[]>([]);
  const [investorOptions, setInvestorOptions] = useState<PartyOption[]>([]);

  const rebalanceDirectors = useCallback(
    (
      nextDirectors: CapitalDirectorRow[],
      nextInvestors: CapitalInvestorRow[],
      budgetStr: string,
      equal: boolean,
    ) => {
      if (!equal) return nextDirectors;
      const budget = Number(String(budgetStr).trim());
      if (!Number.isFinite(budget) || budget <= 0) return nextDirectors;
      const investorTotal = nextInvestors.reduce(
        (sum, row) => sum + num(row.commitmentAmount),
        0,
      );
      return applyEqualDirectorCommitments(
        nextDirectors,
        budget,
        investorTotal,
      );
    },
    [],
  );

  const load = useCallback(async () => {
    if (!canEdit) {
      setForbidden(true);
      setError('Need project.update or participant create/update');
      setLoading(false);
      return;
    }
    if (!selectedProjectId) {
      setError('Select a project first');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to edit capital plan');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const [project, plan, dirs, invs] = await Promise.all([
        fetchProject(selectedProjectId),
        loadCapitalPlanDefaults(selectedProjectId),
        canViewDirectors
          ? fetchDirectorOptions().catch(() => [] as PartyOption[])
          : Promise.resolve([] as PartyOption[]),
        canViewInvestors
          ? fetchInvestorOptions().catch(() => [] as PartyOption[])
          : Promise.resolve([] as PartyOption[]),
      ]);
      const budgetStr =
        project.approvedBudget == null ? '' : String(project.approvedBudget);
      const equal =
        project.equalDirectorInvestment || plan.equalDirectorInvestment;
      setApprovedBudget(budgetStr);
      setEqualDirectorInvestment(equal);
      setDirectors(
        rebalanceDirectors(
          plan.capitalDirectors,
          plan.capitalInvestors,
          budgetStr,
          equal,
        ),
      );
      setInvestors(plan.capitalInvestors);
      setDirectorOptions(dirs);
      setInvestorOptions(invs);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load capital plan'));
    } finally {
      setLoading(false);
    }
  }, [
    canEdit,
    canViewDirectors,
    canViewInvestors,
    isOnline,
    rebalanceDirectors,
    selectedProjectId,
  ]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!equalDirectorInvestment || loading) return;
    setDirectors((prev) =>
      rebalanceDirectors(prev, investors, approvedBudget, true),
    );
    // Intentionally omit `directors` — only rebalance when budget/investors/toggle change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    equalDirectorInvestment,
    approvedBudget,
    investors,
    loading,
    rebalanceDirectors,
  ]);

  const save = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    setError(null);
    try {
      const budgetNum = approvedBudget.trim()
        ? Number(approvedBudget)
        : null;
      if (
        approvedBudget.trim() &&
        (!Number.isFinite(budgetNum) || (budgetNum ?? 0) < 0)
      ) {
        setError('Approved budget must be a non-negative number');
        setSaving(false);
        return;
      }

      if (canUpdateProject) {
        await updateProject(selectedProjectId, {
          approvedBudget: budgetNum,
          equalDirectorInvestment,
        });
      }

      let syncNote = '';
      if (canSyncParticipants) {
        const result = await syncCapitalPlanFromForm(selectedProjectId, {
          approvedBudget,
          equalDirectorInvestment,
          capitalDirectors: directors,
          capitalInvestors: investors,
        });
        if (result.synced > 0) {
          syncNote = ` · capital plan synced (${result.synced})`;
        }
      }

      Alert.alert('Saved', `Capital plan updated${syncNote}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save capital plan'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Capital plan"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · edit`
          : 'Select a project'
      }
    >
      {loading || error || forbidden ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={false}
          onRetry={() => void load()}
        />
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Approved budget</Text>
          <TextInput
            style={styles.input}
            value={approvedBudget}
            onChangeText={setApprovedBudget}
            keyboardType="numeric"
            editable={canUpdateProject}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Equal director investment</Text>
            <Switch
              value={equalDirectorInvestment}
              onValueChange={setEqualDirectorInvestment}
              disabled={!canUpdateProject && !canSyncParticipants}
            />
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Directors</Text>
            <Pressable
              onPress={() =>
                setDirectors((prev) =>
                  rebalanceDirectors(
                    [...prev, emptyDirector()],
                    investors,
                    approvedBudget,
                    equalDirectorInvestment,
                  ),
                )
              }
            >
              <Text style={styles.link}>Add</Text>
            </Pressable>
          </View>

          {directors.length === 0 ? (
            <Text style={styles.hint}>No capital directors yet.</Text>
          ) : null}

          {directors.map((row, index) => (
            <View key={`d-${index}`} style={styles.rowCard}>
              <Text style={styles.label}>Director</Text>
              <View style={styles.chips}>
                {directorOptions.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={[
                      styles.chip,
                      row.directorId === opt.id && styles.chipActive,
                    ]}
                    onPress={() =>
                      setDirectors((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, directorId: opt.id } : r,
                        ),
                      )
                    }
                  >
                    <Text style={styles.chipText}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
              {!directorOptions.length ? (
                <TextInput
                  style={styles.input}
                  value={row.directorId}
                  onChangeText={(v) =>
                    setDirectors((prev) =>
                      prev.map((r, i) =>
                        i === index ? { ...r, directorId: v } : r,
                      ),
                    )
                  }
                  placeholder="Director id"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              ) : null}
              <Text style={styles.label}>Profit %</Text>
              <TextInput
                style={styles.input}
                value={row.profitSharePercent}
                onChangeText={(v) =>
                  setDirectors((prev) =>
                    prev.map((r, i) =>
                      i === index ? { ...r, profitSharePercent: v } : r,
                    ),
                  )
                }
                keyboardType="numeric"
              />
              <Text style={styles.label}>Commitment amount</Text>
              <TextInput
                style={styles.input}
                value={row.commitmentAmount}
                onChangeText={(v) =>
                  setDirectors((prev) =>
                    prev.map((r, i) =>
                      i === index ? { ...r, commitmentAmount: v } : r,
                    ),
                  )
                }
                keyboardType="numeric"
                editable={!equalDirectorInvestment}
              />
              <Pressable
                onPress={() =>
                  setDirectors((prev) =>
                    rebalanceDirectors(
                      prev.filter((_, i) => i !== index),
                      investors,
                      approvedBudget,
                      equalDirectorInvestment,
                    ),
                  )
                }
              >
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Investors</Text>
            <Pressable
              onPress={() => setInvestors((prev) => [...prev, emptyInvestor()])}
            >
              <Text style={styles.link}>Add</Text>
            </Pressable>
          </View>

          {investors.map((row, index) => (
            <View key={`i-${index}`} style={styles.rowCard}>
              <Text style={styles.label}>Investor</Text>
              <View style={styles.chips}>
                {investorOptions.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={[
                      styles.chip,
                      row.investorId === opt.id && styles.chipActive,
                    ]}
                    onPress={() =>
                      setInvestors((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, investorId: opt.id } : r,
                        ),
                      )
                    }
                  >
                    <Text style={styles.chipText}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
              {!investorOptions.length ? (
                <TextInput
                  style={styles.input}
                  value={row.investorId}
                  onChangeText={(v) =>
                    setInvestors((prev) =>
                      prev.map((r, i) =>
                        i === index ? { ...r, investorId: v } : r,
                      ),
                    )
                  }
                  placeholder="Investor id"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              ) : null}
              <Text style={styles.label}>Budget %</Text>
              <TextInput
                style={styles.input}
                value={row.budgetInvestmentPercentage}
                onChangeText={(v) =>
                  setInvestors((prev) =>
                    prev.map((r, i) =>
                      i === index
                        ? { ...r, budgetInvestmentPercentage: v }
                        : r,
                    ),
                  )
                }
                keyboardType="numeric"
              />
              <Text style={styles.label}>Profit %</Text>
              <TextInput
                style={styles.input}
                value={row.profitSharePercent}
                onChangeText={(v) =>
                  setInvestors((prev) =>
                    prev.map((r, i) =>
                      i === index ? { ...r, profitSharePercent: v } : r,
                    ),
                  )
                }
                keyboardType="numeric"
              />
              <Text style={styles.label}>Commitment amount</Text>
              <TextInput
                style={styles.input}
                value={row.commitmentAmount}
                onChangeText={(v) =>
                  setInvestors((prev) =>
                    prev.map((r, i) =>
                      i === index ? { ...r, commitmentAmount: v } : r,
                    ),
                  )
                }
                keyboardType="numeric"
              />
              <Text style={styles.label}>Instrument</Text>
              <View style={styles.chips}>
                {(
                  [
                    ['project_investment', 'Investment'],
                    ['unsecured_loan', 'Loan'],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.chip,
                      row.instrumentType === value && styles.chipActive,
                    ]}
                    onPress={() =>
                      setInvestors((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? {
                                ...r,
                                instrumentType: value,
                                repaymentMode:
                                  value === 'unsecured_loan'
                                    ? r.repaymentMode || 'lumpsum'
                                    : '',
                              }
                            : r,
                        ),
                      )
                    }
                  >
                    <Text style={styles.chipText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              {row.instrumentType === 'unsecured_loan' ? (
                <>
                  <Text style={styles.label}>Repayment</Text>
                  <View style={styles.chips}>
                    {(
                      [
                        ['lumpsum', 'Lumpsum'],
                        ['with_interest', 'With interest'],
                      ] as const
                    ).map(([value, label]) => (
                      <Pressable
                        key={value}
                        style={[
                          styles.chip,
                          row.repaymentMode === value && styles.chipActive,
                        ]}
                        onPress={() =>
                          setInvestors((prev) =>
                            prev.map((r, i) =>
                              i === index ? { ...r, repaymentMode: value } : r,
                            ),
                          )
                        }
                      >
                        <Text style={styles.chipText}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {row.repaymentMode === 'with_interest' ? (
                    <>
                      <Text style={styles.label}>Interest rate %</Text>
                      <TextInput
                        style={styles.input}
                        value={row.interestRate}
                        onChangeText={(v) =>
                          setInvestors((prev) =>
                            prev.map((r, i) =>
                              i === index ? { ...r, interestRate: v } : r,
                            ),
                          )
                        }
                        keyboardType="numeric"
                      />
                    </>
                  ) : null}
                </>
              ) : null}
              <Pressable
                onPress={() =>
                  setInvestors((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            style={[styles.submit, saving && styles.disabled]}
            disabled={saving}
            onPress={() => void save()}
          >
            <Text style={styles.submitText}>
              {saving ? 'Saving…' : 'Save capital plan'}
            </Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  switchLabel: { color: colors.text, flex: 1, paddingRight: 12 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  link: { color: colors.primary, fontWeight: '700' },
  hint: { color: colors.textMuted, marginBottom: 8 },
  rowCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 10,
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
  remove: { color: colors.danger, marginTop: 10, fontWeight: '600' },
  submit: {
    marginTop: 20,
    marginBottom: 32,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, marginBottom: 8 },
});
