import { renderTemplate } from './notifications.template';

describe('renderTemplate', () => {
  it('interpolates variables', () => {
    expect(
      renderTemplate('Hello {{ name }} — {{amount}}', {
        name: 'Luxaria',
        amount: 1200,
      }),
    ).toBe('Hello Luxaria — 1200');
  });

  it('replaces missing variables with empty string', () => {
    expect(renderTemplate('Due {{dueDate}}', {})).toBe('Due ');
  });
});
