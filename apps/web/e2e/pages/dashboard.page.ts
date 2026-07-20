import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  readonly heading = this.page.getByRole('heading', { name: 'Dashboard' });
  readonly welcomeText = this.page.getByText(/^Welcome,/);
  readonly activeProjectText = this.page.getByText(/^Active project:/);

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/');
    await this.heading.waitFor({ state: 'visible' });
  }

  async expectWelcome(name: string) {
    await this.welcomeText.filter({ hasText: name }).waitFor({ state: 'visible' });
  }

  async expectActiveProject(label: string) {
    await this.activeProjectText.filter({ hasText: label }).waitFor({
      state: 'visible',
    });
  }
}
