import {
  buildSkillGaps,
  countConsecutiveDaysBelow,
  evaluateWorkProgress,
  fillRatePercent,
  missingCriticalSkills,
  normalizeSkillKey,
  recommendEscalation,
  resolveShortfallAlerts,
  shortfallPercent,
  skillsMatch,
} from './manpower-planning.validation';
import {
  ManpowerEscalation,
  ManpowerShortfallAlertType,
} from './schemas/manpower-shortfall-alert.schema';

describe('manpower-planning.validation', () => {
  it('normalizes and matches skills across naming styles', () => {
    expect(normalizeSkillKey('Bar-Bender')).toBe('bar bender');
    expect(skillsMatch('mason', 'Mason')).toBe(true);
    expect(skillsMatch('bar_bender', 'Bar Bender')).toBe(true);
  });

  it('computes fill and shortfall percentages', () => {
    expect(fillRatePercent(8, 10)).toBe(80);
    expect(shortfallPercent(8, 10)).toBe(20);
    expect(shortfallPercent(0, 10)).toBe(100);
  });

  it('counts consecutive days below threshold from newest day', () => {
    expect(countConsecutiveDaysBelow([90, 70, 75], 80)).toBe(2);
    expect(countConsecutiveDaysBelow([50, 50, 50], 60)).toBe(3);
    expect(countConsecutiveDaysBelow([50, 90, 50], 60)).toBe(1);
  });

  it('detects missing critical skills in mix comparison', () => {
    const gaps = buildSkillGaps({
      committed: [
        { skill: 'mason', headcount: 10 },
        { skill: 'electrician', headcount: 2 },
      ],
      planned: [
        { skill: 'mason', plannedHeadcount: 10, isCritical: true },
        { skill: 'electrician', plannedHeadcount: 2, isCritical: true },
      ],
      actualBySkill: [{ skill: 'Mason', headcount: 8 }],
    });

    const missing = missingCriticalSkills(gaps);
    expect(missing.map((g) => normalizeSkillKey(g.skill))).toContain(
      'electrician',
    );
    expect(missing.map((g) => normalizeSkillKey(g.skill))).not.toContain(
      'mason',
    );
  });

  it('flags work progress behind linear BOQ schedule', () => {
    const start = new Date('2026-07-01T00:00:00.000Z');
    const end = new Date('2026-07-20T00:00:00.000Z');
    const asOf = new Date('2026-07-11T00:00:00.000Z');
    const result = evaluateWorkProgress({
      items: [
        {
          plannedQuantity: 100,
          startDate: start,
          endDate: end,
          actualCumulative: 20,
        },
      ],
      asOf,
    });
    expect(result.behind).toBe(true);
    expect(result.progressShortfallPercent).toBeGreaterThan(0);
    expect(result.expectedScheduleImpactDays).toBeGreaterThan(0);
  });

  it('resolves alert rules with escalation and schedule impact', () => {
    const masonPresent = {
      skill: 'mason',
      committedHeadcount: 12,
      plannedHeadcount: 12,
      actualHeadcount: 12,
      isCritical: true,
    };
    const masonMissing = {
      ...masonPresent,
      actualHeadcount: 0,
    };

    // 70% fill for 2 consecutive days (below 80, above 60)
    const alerts = resolveShortfallAlerts({
      observations: [
        {
          date: new Date('2026-07-19T00:00:00.000Z'),
          agreementHeadcount: 20,
          plannedHeadcount: 20,
          actualHeadcount: 14,
          attendanceSubmitted: true,
          skillGaps: [masonPresent],
        },
        {
          date: new Date('2026-07-20T00:00:00.000Z'),
          agreementHeadcount: 20,
          plannedHeadcount: 20,
          actualHeadcount: 14,
          attendanceSubmitted: true,
          skillGaps: [masonMissing],
        },
      ],
      workProgress: {
        behind: true,
        progressShortfallPercent: 35,
        expectedScheduleImpactDays: 2.5,
      },
    });

    const types = alerts.map((a) => a.alertType);
    expect(types).toContain(
      ManpowerShortfallAlertType.Below80TwoConsecutiveDays,
    );
    expect(types).toContain(ManpowerShortfallAlertType.MissingCriticalSkill);
    expect(types).toContain(ManpowerShortfallAlertType.WorkProgressBehindPlan);
    expect(types).not.toContain(ManpowerShortfallAlertType.Below60ThreeDays);

    const below80 = alerts.find(
      (a) =>
        a.alertType === ManpowerShortfallAlertType.Below80TwoConsecutiveDays,
    )!;
    expect(below80.shortfallPercent).toBe(30);
    expect(below80.consecutiveDays).toBe(2);
    expect(below80.expectedScheduleImpactDays).toBeGreaterThan(0);
    expect(below80.recommendedEscalation).toBe(
      ManpowerEscalation.SiteSupervisor,
    );

    expect(
      recommendEscalation(ManpowerShortfallAlertType.Below60ThreeDays),
    ).toBe(ManpowerEscalation.CommercialAndPm);
  });

  it('raises no-attendance and below-60-three-days alerts', () => {
    const obs = [0, 1, 2].map((offset) => ({
      date: new Date(`2026-07-${18 + offset}T00:00:00.000Z`),
      agreementHeadcount: 20,
      plannedHeadcount: 20,
      actualHeadcount: offset === 2 ? 0 : 8,
      attendanceSubmitted: offset !== 2,
      skillGaps: [],
    }));
    // force three days below 60%: 8/20 = 40%
    const low = [0, 1, 2].map((offset) => ({
      date: new Date(`2026-07-${18 + offset}T00:00:00.000Z`),
      agreementHeadcount: 20,
      plannedHeadcount: 20,
      actualHeadcount: 8,
      attendanceSubmitted: true,
      skillGaps: [],
    }));

    const missing = resolveShortfallAlerts({ observations: obs });
    expect(missing.map((a) => a.alertType)).toContain(
      ManpowerShortfallAlertType.NoAttendanceSubmitted,
    );

    const severe = resolveShortfallAlerts({ observations: low });
    expect(severe.map((a) => a.alertType)).toContain(
      ManpowerShortfallAlertType.Below60ThreeDays,
    );
    expect(severe.map((a) => a.alertType)).toContain(
      ManpowerShortfallAlertType.Below80TwoConsecutiveDays,
    );
  });
});
