import type {
  ApprovalStepInput,
  ApprovalWorkflowFormState,
  UpsertApprovalWorkflowInput,
} from './types';

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export type WorkflowValidationResult =
  | { ok: true; input: UpsertApprovalWorkflowInput }
  | { ok: false; fieldErrors: Record<string, string>; message: string };

export function defaultWorkflowFormState(): ApprovalWorkflowFormState {
  return {
    name: '',
    allowSelfApprove: false,
    steps: [defaultWorkflowStep(1)],
  };
}

export function defaultWorkflowStep(stepNumber: number) {
  return {
    stepNumber,
    roleIds: [] as string[],
    specificUserIds: [] as string[],
    minimumAmount: 0,
    maximumAmount: null as number | null,
    requiresAll: false,
    escalationHours: null as number | null,
    fallbackRole: null as string | null,
  };
}

export function formStateFromWorkflow(
  workflow: Pick<
    ApprovalWorkflowFormState,
    'allowSelfApprove' | 'steps'
  > & {
    name: string | null;
  } | null,
): ApprovalWorkflowFormState {
  if (!workflow || workflow.steps.length === 0) {
    return defaultWorkflowFormState();
  }
  return {
    name: workflow.name ?? '',
    allowSelfApprove: workflow.allowSelfApprove,
    steps: workflow.steps.map((step) => ({ ...step })),
  };
}

export function renumberSteps(
  steps: ApprovalWorkflowFormState['steps'],
): ApprovalWorkflowFormState['steps'] {
  return steps.map((step, index) => ({
    ...step,
    stepNumber: index + 1,
  }));
}

function validateObjectId(value: string, label: string): string | null {
  if (!OBJECT_ID_RE.test(value)) {
    return `${label} must be a valid id`;
  }
  return null;
}

function validateStep(
  step: ApprovalWorkflowFormState['steps'][number],
  index: number,
): Record<string, string> {
  const prefix = `steps.${index}`;
  const errors: Record<string, string> = {};

  if ((step.roleIds?.length ?? 0) + (step.specificUserIds?.length ?? 0) === 0) {
    errors[`${prefix}.assignees`] =
      'Assign at least one role or specific user';
  }

  for (const roleId of step.roleIds ?? []) {
    const err = validateObjectId(roleId, 'Role id');
    if (err) {
      errors[`${prefix}.roleIds`] = err;
      break;
    }
  }

  for (const userId of step.specificUserIds ?? []) {
    const err = validateObjectId(userId, 'User id');
    if (err) {
      errors[`${prefix}.specificUserIds`] = err;
      break;
    }
  }

  if (step.minimumAmount < 0) {
    errors[`${prefix}.minimumAmount`] = 'Minimum amount cannot be negative';
  }

  if (
    step.maximumAmount != null &&
    step.maximumAmount < step.minimumAmount
  ) {
    errors[`${prefix}.maximumAmount`] =
      'Maximum amount must be greater than or equal to minimum';
  }

  if (step.escalationHours != null && step.escalationHours < 1) {
    errors[`${prefix}.escalationHours`] =
      'Escalation hours must be at least 1 when set';
  }

  if (step.fallbackRole) {
    const err = validateObjectId(step.fallbackRole, 'Fallback role id');
    if (err) {
      errors[`${prefix}.fallbackRole`] = err;
    }
  }

  return errors;
}

export function validateWorkflowForm(args: {
  module: string;
  entityType: string;
  form: ApprovalWorkflowFormState;
}): WorkflowValidationResult {
  const fieldErrors: Record<string, string> = {};
  const module = args.module.trim().toLowerCase();
  const entityType = args.entityType.trim().toLowerCase();

  if (!module) {
    fieldErrors.module = 'Module is required';
  }
  if (!entityType) {
    fieldErrors.entityType = 'Entity type is required';
  }
  if (args.form.steps.length === 0) {
    fieldErrors.steps = 'At least one approval step is required';
  }

  args.form.steps.forEach((step, index) => {
    Object.assign(fieldErrors, validateStep(step, index));
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      message: 'Fix validation errors before saving',
    };
  }

  const steps: ApprovalStepInput[] = renumberSteps(args.form.steps).map(
    (step) => ({
      stepNumber: step.stepNumber,
      roleIds: step.roleIds,
      specificUserIds: step.specificUserIds,
      minimumAmount: step.minimumAmount,
      maximumAmount: step.maximumAmount,
      requiresAll: step.requiresAll,
      escalationHours: step.escalationHours,
      fallbackRole: step.fallbackRole,
    }),
  );

  return {
    ok: true,
    input: {
      module,
      entityType,
      name: args.form.name.trim() ? args.form.name.trim() : null,
      allowSelfApprove: args.form.allowSelfApprove,
      steps,
    },
  };
}
