import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly identifierField = this.page.getByLabel(/email or mobile/i);
  readonly passwordField = this.page.getByLabel(/^password$/i);
  readonly submitButton = this.page.getByRole('button', { name: /sign in/i });

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/login');
    await this.identifierField.waitFor({ state: 'visible' });
  }

  async signIn(identifier: string, password: string) {
    await this.identifierField.fill(identifier);
    await this.passwordField.fill(password);
    await this.submitButton.click();
  }
}
