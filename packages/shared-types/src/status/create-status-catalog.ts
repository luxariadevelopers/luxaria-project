import type {
  StatusBadgeVariant,
  StatusCatalog,
  StatusCatalogDefinition,
  StatusDisplay,
} from './types';

const UNKNOWN_LABEL = 'Unknown';
const UNKNOWN_BADGE: StatusBadgeVariant = 'muted';

export function createStatusCatalog<T extends string>(
  definition: StatusCatalogDefinition<T>,
): StatusCatalog<T> {
  const valueSet = new Set<string>(definition.values);
  const editableSet = new Set<string>(definition.editable ?? []);
  const immutableSet = new Set<string>(definition.immutable ?? []);

  const catalog: StatusCatalog<T> = {
    values: definition.values,

    isKnown(status: string): status is T {
      return valueSet.has(status);
    },

    parse(status: string): T | null {
      return catalog.isKnown(status) ? status : null;
    },

    label(status: string, fallback = UNKNOWN_LABEL): string {
      if (catalog.isKnown(status)) {
        return definition.labels[status];
      }
      return fallback;
    },

    badgeVariant(status: string): StatusBadgeVariant {
      if (catalog.isKnown(status)) {
        return definition.badgeVariants[status];
      }
      return UNKNOWN_BADGE;
    },

    display(status: string, fallbackLabel = UNKNOWN_LABEL): StatusDisplay {
      const known = catalog.isKnown(status);
      return {
        value: status,
        known,
        label: known ? definition.labels[status] : fallbackLabel,
        badgeVariant: known
          ? definition.badgeVariants[status]
          : UNKNOWN_BADGE,
      };
    },

    canTransition(from: string, to: string): boolean {
      if (!catalog.isKnown(from) || !catalog.isKnown(to)) {
        return false;
      }
      if (from === to) {
        return true;
      }
      return definition.transitions[from].includes(to);
    },

    allowedTransitions(from: string): readonly T[] {
      if (!catalog.isKnown(from)) {
        return [];
      }
      return definition.transitions[from];
    },

    isEditable(status: string): boolean {
      if (!definition.editable) {
        return false;
      }
      return catalog.isKnown(status) && editableSet.has(status);
    },

    isImmutable(status: string): boolean {
      if (!catalog.isKnown(status)) {
        return true;
      }
      if (definition.immutable) {
        return immutableSet.has(status);
      }
      if (definition.editable) {
        return !editableSet.has(status);
      }
      return definition.transitions[status].length === 0;
    },
  };

  return catalog;
}
