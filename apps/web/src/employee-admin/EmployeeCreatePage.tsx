import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { PageHeader } from '@/layouts/PageHeader';
import { useProjectsList } from '@/projects/useProjects';
import { useUsersList } from '@/user-admin/useUsers';
import {
  canManageSites,
  canProvisionSiteEngineer,
  canViewSites,
} from './roleAccess';
import {
  SITE_ENGINEER_ACCESS_MODULES,
  buildPermissionDeniesFromModules,
  defaultEnabledModules,
} from './siteEngineerAccessModules';
import {
  clearSiteEngineerWizardDraft,
  loadSiteEngineerWizardDraft,
  saveSiteEngineerWizardDraft,
  toDraftValues,
} from './siteEngineerWizardDraft';
import {
  DEFAULT_DEPARTMENT_CODE,
  DEFAULT_DESIGNATION_CODE,
  DEFAULT_ROLE_CODE,
} from './types';
import {
  useCreateSite,
  useDepartmentsList,
  useDesignationsList,
  useProvisionSiteEngineer,
  useSitesList,
} from './useEmployees';

const STEPS = [
  'Personal',
  'Organisation',
  'Login',
  'Access',
  'Project & Site',
  'Review',
] as const;

type WizardValues = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  mobile: string;
  employeeCode: string;
  departmentId: string;
  designationId: string;
  reportingOfficerUserIds: string[];
  reportingManagerUserId: string;
  reportingApprovalMode: 'any' | 'all';
  createLogin: boolean;
  password: string;
  confirmPassword: string;
  /** Module id → enabled. Unchecked modules become permission denies. */
  enabledModules: Record<string, boolean>;
  projectId: string;
  siteId: string;
};

const INITIAL: WizardValues = {
  firstName: '',
  lastName: '',
  displayName: '',
  email: '',
  mobile: '',
  employeeCode: '',
  departmentId: '',
  designationId: '',
  reportingOfficerUserIds: [],
  reportingManagerUserId: '',
  reportingApprovalMode: 'any',
  createLogin: true,
  password: '',
  confirmPassword: '',
  enabledModules: defaultEnabledModules(),
  projectId: '',
  siteId: '',
};

function readWizardBootState(): {
  activeStep: number;
  values: WizardValues;
  restored: boolean;
} {
  const draft = loadSiteEngineerWizardDraft();
  if (!draft) {
    return { activeStep: 0, values: INITIAL, restored: false };
  }
  return {
    activeStep: draft.activeStep,
    values: {
      ...INITIAL,
      ...draft.values,
      password: '',
      confirmPassword: '',
    },
    restored: true,
  };
}

function CreateSiteDialog({
  open,
  projectId,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: (siteId: string) => void;
}) {
  const notify = useNotify();
  const createSite = useCreateSite();
  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const site = await createSite.mutateAsync({
        projectId,
        siteCode: siteCode.trim(),
        siteName: siteName.trim(),
      });
      notify.success(`Site ${site.siteCode} created`);
      onCreated(site.id);
      setSiteCode('');
      setSiteName('');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create site'));
      notify.error('Site creation failed');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create site</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Site code"
            value={siteCode}
            onChange={(e) => setSiteCode(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Site name"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            required
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={createSite.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={
            createSite.isPending || !siteCode.trim() || !siteName.trim()
          }
        >
          {createSite.isPending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            'Create'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function EmployeeCreatePage() {
  const { access, hasPermission } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const allowed = canProvisionSiteEngineer(access);
  const [boot] = useState(readWizardBootState);
  const [activeStep, setActiveStep] = useState(boot.activeStep);
  const [values, setValues] = useState<WizardValues>(boot.values);
  const [draftRestored, setDraftRestored] = useState(boot.restored);
  const [serverError, setServerError] = useState<unknown>();
  const [createSiteOpen, setCreateSiteOpen] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    saveSiteEngineerWizardDraft({
      activeStep,
      values: toDraftValues(values),
    });
  }, [activeStep, values]);

  const discardDraft = () => {
    clearSiteEngineerWizardDraft();
    setActiveStep(0);
    setValues({
      ...INITIAL,
      reportingOfficerUserIds: [],
      enabledModules: defaultEnabledModules(),
    });
    setDraftRestored(false);
    setStepError(null);
    setServerError(undefined);
  };

  const departmentsQuery = useDepartmentsList(
    allowed && hasPermission('department.view'),
  );
  const designationsQuery = useDesignationsList(
    allowed && hasPermission('designation.view'),
  );
  const managersQuery = useUsersList(
    {
      page: 1,
      limit: 100,
      status: 'active',
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    allowed && hasPermission('user.view'),
  );
  const projectsQuery = useProjectsList(
    { page: 1, limit: 100, sortBy: 'projectName', sortOrder: 'asc' },
    allowed && hasPermission('project.view'),
  );
  const sitesQuery = useSitesList(
    {
      page: 1,
      limit: 100,
      projectId: values.projectId || undefined,
    },
    allowed && canViewSites(access) && Boolean(values.projectId),
  );
  const provisionMutation = useProvisionSiteEngineer();

  const engineeringDept = useMemo(
    () =>
      (departmentsQuery.data ?? []).find(
        (row) => row.code === DEFAULT_DEPARTMENT_CODE,
      ) ?? null,
    [departmentsQuery.data],
  );
  const siteEngineerDesig = useMemo(
    () =>
      (designationsQuery.data ?? []).find(
        (row) => row.code === DEFAULT_DESIGNATION_CODE,
      ) ?? null,
    [designationsQuery.data],
  );

  useEffect(() => {
    setValues((prev) => {
      let next = prev;
      if (!prev.departmentId && engineeringDept) {
        next = { ...next, departmentId: engineeringDept.id };
      }
      if (!prev.designationId && siteEngineerDesig) {
        next = { ...next, designationId: siteEngineerDesig.id };
      }
      return next === prev ? prev : next;
    });
  }, [engineeringDept, siteEngineerDesig]);

  const patch = (partial: Partial<WizardValues>) => {
    setValues((prev) => ({ ...prev, ...partial }));
    setStepError(null);
  };

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!values.firstName.trim()) return 'First name is required';
      if (!values.lastName.trim()) return 'Last name is required';
      if (!values.email.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
        return 'Enter a valid email';
      }
    }
    if (step === 1) {
      if (!values.departmentId && !engineeringDept) {
        return 'Engineering department is required (or will use ENGINEERING code)';
      }
      if (!values.designationId && !siteEngineerDesig) {
        return 'Designation is required (defaults to Site Engineer if left empty)';
      }
    }
    if (step === 2) {
      if (!values.createLogin) {
        return 'This vertical slice requires createLogin to be enabled';
      }
      if (!values.password || values.password.length < 8) {
        return 'Password must be at least 8 characters';
      }
      if (values.password !== values.confirmPassword) {
        return 'Passwords do not match';
      }
    }
    if (step === 4) {
      if (!values.projectId) return 'Select a project';
      if (!values.siteId) return 'Select a site';
    }
    return null;
  };

  const goNext = () => {
    const error = validateStep(activeStep);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStepError(null);
    setActiveStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    const error = validateStep(4) ?? validateStep(2) ?? validateStep(0);
    if (error) {
      setStepError(error);
      return;
    }
    setServerError(undefined);
    try {
      const result = await provisionMutation.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        displayName: values.displayName.trim() || undefined,
        email: values.email.trim(),
        mobile: values.mobile.trim() || null,
        employeeCode: values.employeeCode.trim() || undefined,
        departmentId: values.departmentId || undefined,
        departmentCode: values.departmentId
          ? undefined
          : DEFAULT_DEPARTMENT_CODE,
        designationId: values.designationId || undefined,
        designationCode: values.designationId
          ? undefined
          : DEFAULT_DESIGNATION_CODE,
        reportingOfficerUserIds:
          values.reportingOfficerUserIds.length > 0
            ? values.reportingOfficerUserIds
            : undefined,
        reportingManagerUserId: values.reportingManagerUserId || null,
        reportingApprovalMode:
          values.reportingOfficerUserIds.length > 0
            ? values.reportingApprovalMode
            : undefined,
        createLogin: true,
        password: values.password,
        roleCode: DEFAULT_ROLE_CODE,
        projectId: values.projectId,
        siteId: values.siteId,
        permissionDenies: (() => {
          const denies = buildPermissionDeniesFromModules(
            values.enabledModules,
          );
          return denies.length > 0 ? denies : undefined;
        })(),
      });
      clearSiteEngineerWizardDraft();
      notify.success(
        `Employee ${result.employee.employeeCode} provisioned successfully`,
      );
      void navigate(`/administration/employees/${result.employee.id}`, {
        replace: true,
      });
    } catch (err) {
      setServerError(err);
      notify.error(getErrorMessage(err, 'Could not create employee'));
    }
  };

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!allowed) {
    return (
      <PermissionDenied
        title="Create employee unavailable"
        message="You need employee.create, user.create, project_access.assign, and site_access.assign to create an employee."
      />
    );
  }

  const departmentName =
    (departmentsQuery.data ?? []).find((d) => d.id === values.departmentId)
      ?.name ?? DEFAULT_DEPARTMENT_CODE;
  const designationName =
    (designationsQuery.data ?? []).find((d) => d.id === values.designationId)
      ?.name ?? DEFAULT_DESIGNATION_CODE;
  const projectName =
    (projectsQuery.data?.items ?? []).find((p) => p.id === values.projectId)
      ?.projectName ?? values.projectId;
  const siteName =
    (sitesQuery.data?.items ?? []).find((s) => s.id === values.siteId)
      ?.siteName ?? values.siteId;
  const managerOptions = managersQuery.data?.items ?? [];
  const managerNames =
    values.reportingOfficerUserIds.length === 0
      ? '—'
      : values.reportingOfficerUserIds
          .map(
            (id) =>
              managerOptions.find((u) => u.id === id)?.fullName ?? id,
          )
          .join(', ');
  const primaryManagerName = values.reportingManagerUserId
    ? (managerOptions.find((u) => u.id === values.reportingManagerUserId)
        ?.fullName ?? values.reportingManagerUserId)
    : '—';

  return (
    <Stack spacing={2.5} data-testid="employee-create-page">
      <PageHeader
        title="Create Employee"
        subtitle="Add employee details, choose designation (who they are appointed as), set login, access, and project/site assignment."
      />

      <Stepper activeStep={activeStep} alternativeLabel>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {draftRestored ? (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={discardDraft}>
              Start over
            </Button>
          }
        >
          Progress restored after refresh. Passwords are not saved — re-enter
          them on the Login step before submit.
        </Alert>
      ) : null}

      {stepError ? <Alert severity="warning">{stepError}</Alert> : null}
      {serverError ? (
        <Alert severity="error">
          {getErrorMessage(serverError, 'Create employee failed')}
        </Alert>
      ) : null}

      {activeStep === 0 ? (
        <Stack spacing={2} sx={{ maxWidth: 560 }}>
          <TextField
            label="First name"
            required
            value={values.firstName}
            onChange={(e) => patch({ firstName: e.target.value })}
            fullWidth
          />
          <TextField
            label="Last name"
            required
            value={values.lastName}
            onChange={(e) => patch({ lastName: e.target.value })}
            fullWidth
          />
          <TextField
            label="Display name"
            value={values.displayName}
            onChange={(e) => patch({ displayName: e.target.value })}
            helperText="Defaults to first + last name if left blank"
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            required
            value={values.email}
            onChange={(e) => patch({ email: e.target.value })}
            fullWidth
          />
          <TextField
            label="Mobile"
            value={values.mobile}
            onChange={(e) => patch({ mobile: e.target.value })}
            fullWidth
          />
          <TextField
            label="Employee code"
            value={values.employeeCode}
            onChange={(e) => patch({ employeeCode: e.target.value })}
            helperText="Leave blank to auto-generate"
            fullWidth
          />
        </Stack>
      ) : null}

      {activeStep === 1 ? (
        <Stack spacing={2} sx={{ maxWidth: 560 }}>
          <FormControl fullWidth>
            <InputLabel id="dept-select">Department</InputLabel>
            <Select
              labelId="dept-select"
              label="Department"
              value={values.departmentId}
              onChange={(e) => patch({ departmentId: e.target.value })}
            >
              {(departmentsQuery.data ?? []).map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.name} ({row.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Default: Engineering ({DEFAULT_DEPARTMENT_CODE})
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="desig-select">Designation</InputLabel>
            <Select
              labelId="desig-select"
              label="Designation"
              value={values.designationId}
              onChange={(e) => patch({ designationId: e.target.value })}
            >
              {(designationsQuery.data ?? []).map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.name} ({row.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Default: Site Engineer ({DEFAULT_DESIGNATION_CODE})
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="manager-select">Reporting officers</InputLabel>
            <Select
              labelId="manager-select"
              label="Reporting officers"
              multiple
              value={values.reportingOfficerUserIds}
              onChange={(e) => {
                const raw = e.target.value;
                const next = (
                  typeof raw === 'string' ? raw.split(',') : raw
                ).slice(0, 2);
                const primary = values.reportingManagerUserId;
                patch({
                  reportingOfficerUserIds: next,
                  reportingManagerUserId: !next.length
                    ? ''
                    : next.includes(primary)
                      ? primary
                      : (next[0] ?? ''),
                });
              }}
              renderValue={(selected) => {
                const ids = selected as string[];
                if (!ids.length) return 'None';
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {ids.map((id) => (
                      <Chip
                        key={id}
                        size="small"
                        label={
                          managerOptions.find((u) => u.id === id)?.fullName ??
                          id
                        }
                      />
                    ))}
                  </Box>
                );
              }}
            >
              {managerOptions.map((row) => (
                <MenuItem
                  key={row.id}
                  value={row.id}
                  disabled={
                    values.reportingOfficerUserIds.length >= 2 &&
                    !values.reportingOfficerUserIds.includes(row.id)
                  }
                >
                  <Checkbox
                    checked={values.reportingOfficerUserIds.includes(row.id)}
                  />
                  <ListItemText primary={row.fullName} />
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Select 1 or 2 people. If one is unavailable, the other can still
              cover (when approval rule is “Any one”).
            </FormHelperText>
          </FormControl>
          <FormControl
            fullWidth
            disabled={values.reportingOfficerUserIds.length === 0}
          >
            <InputLabel id="primary-manager-select">
              Primary reporting officer
            </InputLabel>
            <Select
              labelId="primary-manager-select"
              label="Primary reporting officer"
              value={values.reportingManagerUserId}
              onChange={(e) =>
                patch({ reportingManagerUserId: e.target.value })
              }
            >
              {values.reportingOfficerUserIds.map((id) => (
                <MenuItem key={id} value={id}>
                  {managerOptions.find((u) => u.id === id)?.fullName ?? id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            fullWidth
            disabled={values.reportingOfficerUserIds.length === 0}
          >
            <InputLabel id="approval-mode-select">Approval rule</InputLabel>
            <Select
              labelId="approval-mode-select"
              label="Approval rule"
              value={values.reportingApprovalMode}
              onChange={(e) =>
                patch({
                  reportingApprovalMode: e.target.value as 'any' | 'all',
                })
              }
            >
              <MenuItem value="any">
                Any one reporting officer can approve
              </MenuItem>
              <MenuItem value="all">
                All reporting officers must approve
              </MenuItem>
            </Select>
            <FormHelperText>
              Use “Any one” so a second officer can approve if the first cannot.
            </FormHelperText>
          </FormControl>
        </Stack>
      ) : null}

      {activeStep === 2 ? (
        <Stack spacing={2} sx={{ maxWidth: 560 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={values.createLogin}
                onChange={(e) => patch({ createLogin: e.target.checked })}
              />
            }
            label="Create login account"
          />
          {!values.createLogin ? (
            <Alert severity="warning">
              A login account is required to create this employee.
            </Alert>
          ) : null}
          <TextField
            label="Password"
            type="password"
            required
            value={values.password}
            onChange={(e) => patch({ password: e.target.value })}
            helperText="Minimum 8 characters"
            fullWidth
            disabled={!values.createLogin}
          />
          <TextField
            label="Confirm password"
            type="password"
            required
            value={values.confirmPassword}
            onChange={(e) => patch({ confirmPassword: e.target.value })}
            fullWidth
            disabled={!values.createLogin}
          />
        </Stack>
      ) : null}

      {activeStep === 3 ? (
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <Alert severity="info">
            Module access only (not view / edit / approve). Tick what they
            should see on the <strong>web dashboard</strong> and{' '}
            <strong>mobile app</strong>. Untick to hide a module.
          </Alert>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                patch({ enabledModules: defaultEnabledModules() })
              }
            >
              Enable all
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                patch({
                  enabledModules: Object.fromEntries(
                    SITE_ENGINEER_ACCESS_MODULES.map((module) => [
                      module.id,
                      false,
                    ]),
                  ),
                })
              }
            >
              Disable all
            </Button>
          </Stack>
          <FormGroup>
            {SITE_ENGINEER_ACCESS_MODULES.map((module) => {
              const surfaces = [
                module.web ? 'Web' : null,
                module.mobile ? 'Mobile' : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <FormControlLabel
                  key={module.id}
                  control={
                    <Checkbox
                      checked={values.enabledModules[module.id] !== false}
                      onChange={(e) =>
                        patch({
                          enabledModules: {
                            ...values.enabledModules,
                            [module.id]: e.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label={
                    <Stack spacing={0.15} sx={{ py: 0.25 }}>
                      <Typography variant="body2">
                        {module.label}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          {surfaces}
                        </Typography>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {module.description}
                      </Typography>
                    </Stack>
                  }
                  sx={{ alignItems: 'flex-start', mb: 0.5 }}
                />
              );
            })}
          </FormGroup>
        </Stack>
      ) : null}

      {activeStep === 4 ? (
        <Stack spacing={2} sx={{ maxWidth: 560 }}>
          <FormControl fullWidth required>
            <InputLabel id="project-select">Project</InputLabel>
            <Select
              labelId="project-select"
              label="Project"
              value={values.projectId}
              onChange={(e) =>
                patch({ projectId: e.target.value, siteId: '' })
              }
            >
              {(projectsQuery.data?.items ?? []).map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.projectName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required disabled={!values.projectId}>
            <InputLabel id="site-select">Site</InputLabel>
            <Select
              labelId="site-select"
              label="Site"
              value={values.siteId}
              onChange={(e) => patch({ siteId: e.target.value })}
            >
              {(sitesQuery.data?.items ?? []).map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.siteName} ({row.siteCode})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {values.projectId &&
          sitesQuery.isSuccess &&
          (sitesQuery.data?.items.length ?? 0) === 0 ? (
            <Alert severity="info">
              No sites for this project yet.
              {canManageSites(access) ? ' Create one below.' : null}
            </Alert>
          ) : null}
          {values.projectId && canManageSites(access) ? (
            <Box>
              <Button
                variant="outlined"
                onClick={() => setCreateSiteOpen(true)}
              >
                Create site
              </Button>
            </Box>
          ) : null}
          <CreateSiteDialog
            open={createSiteOpen}
            projectId={values.projectId}
            onClose={() => setCreateSiteOpen(false)}
            onCreated={(siteId) => patch({ siteId })}
          />
        </Stack>
      ) : null}

      {activeStep === 5 ? (
        <Stack spacing={1.5} sx={{ maxWidth: 640 }}>
          <Typography variant="subtitle1">Review & submit</Typography>
          <Typography variant="body2">
            <strong>Name:</strong> {values.firstName} {values.lastName}
            {values.displayName ? ` (${values.displayName})` : ''}
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> {values.email}
          </Typography>
          <Typography variant="body2">
            <strong>Mobile:</strong> {values.mobile || '—'}
          </Typography>
          <Typography variant="body2">
            <strong>Employee code:</strong>{' '}
            {values.employeeCode || 'Auto-generated'}
          </Typography>
          <Typography variant="body2">
            <strong>Department:</strong> {departmentName}
          </Typography>
          <Typography variant="body2">
            <strong>Designation:</strong> {designationName}
          </Typography>
          <Typography variant="body2">
            <strong>Reporting officers:</strong> {managerNames}
          </Typography>
          <Typography variant="body2">
            <strong>Primary officer:</strong> {primaryManagerName}
          </Typography>
          <Typography variant="body2">
            <strong>Approval rule:</strong>{' '}
            {values.reportingOfficerUserIds.length === 0
              ? '—'
              : values.reportingApprovalMode === 'all'
                ? 'All must approve'
                : 'Any one can approve'}
          </Typography>
          <Typography variant="body2">
            <strong>Login:</strong> Yes (password set)
          </Typography>
          <Typography variant="body2">
            <strong>Hidden modules:</strong>{' '}
            {SITE_ENGINEER_ACCESS_MODULES.filter(
              (module) => values.enabledModules[module.id] === false,
            )
              .map((module) => module.label)
              .join(', ') || 'None (full module access)'}
          </Typography>
          <Typography variant="body2">
            <strong>Project:</strong> {projectName}
          </Typography>
          <Typography variant="body2">
            <strong>Site:</strong> {siteName}
          </Typography>
        </Stack>
      ) : null}

      <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
        <Button
          component={RouterLink}
          to="/administration/employees"
          disabled={provisionMutation.isPending}
          onClick={() => clearSiteEngineerWizardDraft()}
        >
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={goBack}
          disabled={activeStep === 0 || provisionMutation.isPending}
        >
          Back
        </Button>
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={goNext}>
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            data-testid="employee-create-submit"
            onClick={() => void submit()}
            disabled={provisionMutation.isPending}
          >
            {provisionMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Create Employee'
            )}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

/** Alias for the multi-step employee create wizard. */
export { EmployeeCreatePage as EmployeeCreateWizard };
