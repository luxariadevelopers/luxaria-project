import type { Page } from '@playwright/test';
import type { E2eRuntimeState } from './test-env';

export async function selectSeededProject(
  page: Page,
  state: Pick<E2eRuntimeState, 'projectCode' | 'projectName'>,
): Promise<void> {
  const projectSelector = page.getByLabel(/^project$/i);
  await projectSelector.click();
  await page
    .getByRole('option', {
      name: new RegExp(
        `${state.projectCode} — ${state.projectName}`.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        ),
      ),
    })
    .click();
}
