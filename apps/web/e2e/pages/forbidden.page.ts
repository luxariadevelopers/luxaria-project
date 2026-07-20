import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class ForbiddenPage extends BasePage {
  readonly heading = this.page.getByRole('heading', { name: 'Access denied' });
  readonly message = this.page.getByText(
    /you do not have permission to view this page/i,
  );

  constructor(page: Page) {
    super(page);
  }

  async expectVisible() {
    await this.heading.waitFor({ state: 'visible' });
    await this.message.waitFor({ state: 'visible' });
  }
}
