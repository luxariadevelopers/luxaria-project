import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
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
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
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
  const [hydrated, setHydrated] = useState(false);
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
      setHydrated(false);
      setLoading(false);
      return;
    }
    if (!selectedProjectId) {
      setError('Select a project first');
      setHydrated(false);
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to edit capital plan');
      setHydrated(false);
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
      setHydrated(true);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load capital plan'));
      setHydrated(false);
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
      {loading || forbidden || !hydrated ? (
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

          <FormSection title="Budget">
            <TextField
              label="Approved budget"
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
          </FormSection>

          <FormSection
            title="Directors"
            description={
              directors.length === 0 ? 'No capital directors yet.' : undefined
            }
            framed={false}
          >
            <Button
              label="+ Add director"
              variant="ghost"
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
              style={styles.addBtn}
            />

            {directors.map((row, index) => (
              <FormSection key={`d-${index}`} title={`Director ${index + 1}`}>
                <Text style={styles.label}>Director</Text>
                <View style={styles.chips}>
                  {directorOptions.map((opt) => (
                    <Chip
                      key={opt.id}
                      label={opt.label}
                      selected={row.directorId === opt.id}
                      onPress={() =>
                        setDirectors((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, directorId: opt.id } : r,
                          ),
                        )
                      }
                    />
                  ))}
                </View>
                {!directorOptions.length ? (
                  <TextField
                    label="Director id"
                    value={row.directorId}
                    onChangeText={(v) =>
                      setDirectors((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, directorId: v } : r,
                        ),
                      )
                    }
                    placeholder="Director id"
                    autoCapitalize="none"
                  />
                ) : null}
                <TextField
                  label="Profit %"
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
                <TextField
                  label="Commitment amount"
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
                <Button
                  label="Remove"
                  variant="danger"
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
                />
              </FormSection>
            ))}
          </FormSection>

          <FormSection title="Investors" framed={false}>
            <Button
              label="+ Add investor"
              variant="ghost"
              onPress={() => setInvestors((prev) => [...prev, emptyInvestor()])}
              style={styles.addBtn}
            />

            {investors.map((row, index) => (
              <FormSection key={`i-${index}`} title={`Investor ${index + 1}`}>
                <Text style={styles.label}>Investor</Text>
                <View style={styles.chips}>
                  {investorOptions.map((opt) => (
                    <Chip
                      key={opt.id}
                      label={opt.label}
                      selected={row.investorId === opt.id}
                      onPress={() =>
                        setInvestors((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, investorId: opt.id } : r,
                          ),
                        )
                      }
                    />
                  ))}
                </View>
                {!investorOptions.length ? (
                  <TextField
                    label="Investor id"
                    value={row.investorId}
                    onChangeText={(v) =>
                      setInvestors((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, investorId: v } : r,
                        ),
                      )
                    }
                    placeholder="Investor id"
                    autoCapitalize="none"
                  />
                ) : null}
                <TextField
                  label="Budget %"
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
                <TextField
                  label="Profit %"
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
                <TextField
                  label="Commitment amount"
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
                    <Chip
                      key={value}
                      label={label}
                      selected={row.instrumentType === value}
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
                    />
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
                        <Chip
                          key={value}
                          label={label}
                          selected={row.repaymentMode === value}
                          onPress={() =>
                            setInvestors((prev) =>
                              prev.map((r, i) =>
                                i === index
                                  ? { ...r, repaymentMode: value }
                                  : r,
                              ),
                            )
                          }
                        />
                      ))}
                    </View>
                    {row.repaymentMode === 'with_interest' ? (
                      <TextField
                        label="Interest rate %"
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
                    ) : null}
                  </>
                ) : null}
                <Button
                  label="Remove"
                  variant="danger"
                  onPress={() =>
                    setInvestors((prev) => prev.filter((_, i) => i !== index))
                  }
                />
              </FormSection>
            ))}
          </FormSection>

          <Button
            label="Save capital plan"
            loading={saving}
            disabled={saving}
            onPress={() => void save()}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  switchLabel: { ...typography.body, flex: 1, paddingRight: spacing.md },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addBtn: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
