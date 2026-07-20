const INVESTOR_PROJECT_KEY = 'luxaria.investorSelectedProjectId';

export const investorProjectStorage = {
  getSelectedProjectId(): string | null {
    return localStorage.getItem(INVESTOR_PROJECT_KEY);
  },
  setSelectedProjectId(projectId: string | null) {
    if (!projectId) {
      localStorage.removeItem(INVESTOR_PROJECT_KEY);
      return;
    }
    localStorage.setItem(INVESTOR_PROJECT_KEY, projectId);
  },
  clearSelectedProjectId() {
    localStorage.removeItem(INVESTOR_PROJECT_KEY);
  },
};
