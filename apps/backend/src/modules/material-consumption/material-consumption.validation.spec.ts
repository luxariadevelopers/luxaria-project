import { BadRequestException } from '@nestjs/common';
import {
  assertVarianceApprovalComment,
  assertVarianceExplained,
  computeConsumptionMetrics,
  evaluateConsumptionAlerts,
  MaterialConsumptionAlert,
  percentVariance,
  varianceRequiresApproval,
} from './material-consumption.validation';

describe('material-consumption.validation', () => {
  describe('computeConsumptionMetrics', () => {
    it('calculates theoretical vs actual consumption and variance', () => {
      // 10 m³ × 7.5 bags/m³ = 75; 2% wastage → allowed 1.5; expected 76.5
      // issued 80, returned 2 → net 78; variance +1.5
      const metrics = computeConsumptionMetrics({
        workQuantityCompleted: 10,
        coefficient: 7.5,
        wastagePercentage: 2,
        actualMaterialIssued: 80,
        materialReturned: 2,
        standardRate: 400,
      });

      expect(metrics.workQuantityCompleted).toBe(10);
      expect(metrics.standardMaterialRequirement).toBe(75);
      expect(metrics.allowedWastage).toBe(1.5);
      expect(metrics.expectedConsumption).toBe(76.5);
      expect(metrics.actualMaterialIssued).toBe(80);
      expect(metrics.materialReturned).toBe(2);
      expect(metrics.netActualConsumption).toBe(78);
      expect(metrics.varianceQuantity).toBe(1.5);
      expect(metrics.variancePercentage).toBe(
        percentVariance(78, 76.5),
      );
      expect(metrics.varianceValue).toBe(600); // 1.5 × 400
    });

    it('handles zero expected consumption', () => {
      const metrics = computeConsumptionMetrics({
        workQuantityCompleted: 0,
        coefficient: 0,
        wastagePercentage: 0,
        actualMaterialIssued: 5,
        materialReturned: 0,
        standardRate: 100,
      });
      expect(metrics.expectedConsumption).toBe(0);
      expect(metrics.variancePercentage).toBe(100);
      expect(metrics.varianceValue).toBe(500);
    });
  });

  describe('evaluateConsumptionAlerts', () => {
    const base = computeConsumptionMetrics({
      workQuantityCompleted: 10,
      coefficient: 1,
      wastagePercentage: 0,
      actualMaterialIssued: 10,
      materialReturned: 0,
      standardRate: 1,
    });

    it('flags above allowed variance when net exceeds expected', () => {
      const metrics = { ...base, varianceQuantity: 2, netActualConsumption: 12 };
      expect(
        evaluateConsumptionAlerts({
          metrics,
          materialRequired: true,
          hasUnexplainedStockShortage: false,
        }),
      ).toContain(MaterialConsumptionAlert.AboveAllowedVariance);
    });

    it('flags negative consumption', () => {
      const metrics = {
        ...base,
        netActualConsumption: -1,
        varianceQuantity: -11,
      };
      expect(
        evaluateConsumptionAlerts({
          metrics,
          materialRequired: true,
          hasUnexplainedStockShortage: false,
        }),
      ).toContain(MaterialConsumptionAlert.NegativeConsumption);
    });

    it('flags material issue without progress', () => {
      const metrics = computeConsumptionMetrics({
        workQuantityCompleted: 0,
        coefficient: 1,
        wastagePercentage: 0,
        actualMaterialIssued: 5,
        materialReturned: 0,
        standardRate: 1,
      });
      expect(
        evaluateConsumptionAlerts({
          metrics,
          materialRequired: true,
          hasUnexplainedStockShortage: false,
        }),
      ).toContain(MaterialConsumptionAlert.MaterialIssueWithoutProgress);
    });

    it('flags progress without material issue when material is required', () => {
      const metrics = computeConsumptionMetrics({
        workQuantityCompleted: 8,
        coefficient: 2,
        wastagePercentage: 0,
        actualMaterialIssued: 0,
        materialReturned: 0,
        standardRate: 1,
      });
      expect(
        evaluateConsumptionAlerts({
          metrics,
          materialRequired: true,
          hasUnexplainedStockShortage: false,
        }),
      ).toContain(MaterialConsumptionAlert.ProgressWithoutMaterialIssue);
    });

    it('flags unexplained stock shortage', () => {
      expect(
        evaluateConsumptionAlerts({
          metrics: base,
          materialRequired: true,
          hasUnexplainedStockShortage: true,
        }),
      ).toContain(MaterialConsumptionAlert.UnexplainedStockShortage);
    });
  });

  describe('varianceRequiresApproval / explanation gates', () => {
    it('requires approval for above-allowed variance', () => {
      const metrics = computeConsumptionMetrics({
        workQuantityCompleted: 10,
        coefficient: 1,
        wastagePercentage: 0,
        actualMaterialIssued: 12,
        materialReturned: 0,
        standardRate: 10,
      });
      const alerts = evaluateConsumptionAlerts({
        metrics,
        materialRequired: true,
        hasUnexplainedStockShortage: false,
      });
      expect(
        varianceRequiresApproval({
          metrics,
          alerts,
          thresholdPercent: 5,
        }),
      ).toBe(true);
    });

    it('requires explanation when approval is needed', () => {
      expect(() =>
        assertVarianceExplained({
          requiresApproval: true,
          explanation: null,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        assertVarianceExplained({
          requiresApproval: true,
          explanation: 'Site mix richer than BOQ',
        }),
      ).not.toThrow();
    });

    it('requires approval comment when approving variance report', () => {
      expect(() =>
        assertVarianceApprovalComment({
          requiresApproval: true,
          approvalComment: '  ',
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        assertVarianceApprovalComment({
          requiresApproval: false,
          approvalComment: null,
        }),
      ).not.toThrow();
    });
  });
});
