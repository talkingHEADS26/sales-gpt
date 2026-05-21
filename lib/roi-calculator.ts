export const ROI_RAMP_UP_FACTORS = [
  0.25,
  0.25,
  0.5,
  0.5,
  0.75,
  0.75,
  1,
  1,
  1,
  1,
  1,
  1,
] as const;

export const ROI_DEFAULTS = {
  dealValue: 600,
  conversationsPerMonth: 10,
  improvementRate: 0.15,
  teamSize: 3,
} as const;

export const ROI_IMPROVEMENT_OPTIONS = [0.1, 0.15, 0.2] as const;
export const ROI_TEAM_SIZE_OPTIONS = [1, 3, 5] as const;

export type RoiCalculatorInput = {
  dealValue: number;
  conversationsPerMonth: number;
  improvementRate: number;
  teamSize: number;
};

export type RoiCalculatorResult = {
  monthlyGainAtFullEffect: number;
  annualGain: number;
  perSeatMonthlyGain: number;
  totalConversationsPerMonth: number;
};

export function calculateRoi({
  dealValue,
  conversationsPerMonth,
  improvementRate,
  teamSize,
}: RoiCalculatorInput): RoiCalculatorResult {
  const totalConversationsPerMonth = conversationsPerMonth * teamSize;
  const monthlyGainAtFullEffect =
    dealValue * totalConversationsPerMonth * improvementRate;
  const annualGain = ROI_RAMP_UP_FACTORS.reduce(
    (sum, factor) => sum + monthlyGainAtFullEffect * factor,
    0
  );
  const perSeatMonthlyGain = monthlyGainAtFullEffect / teamSize;

  return {
    monthlyGainAtFullEffect,
    annualGain,
    perSeatMonthlyGain,
    totalConversationsPerMonth,
  };
}
