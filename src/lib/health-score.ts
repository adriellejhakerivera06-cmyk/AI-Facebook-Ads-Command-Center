/**
 * Campaign Health Score Calculation
 *
 * DOCUMENTED FORMULA:
 * ===================
 *
 * The Health Score is a weighted composite score (0-100) calculated from:
 * - ROAS Score: 30% weight
 * - CPA Score: 25% weight
 * - CTR Score: 20% weight
 * - Frequency Score: 15% weight
 * - Conversion Rate Score: 10% weight
 *
 * Each factor is scored 0-100 using industry-standard benchmarks:
 *
 * ROAS BENCHMARKS:
 * - >= 4.0 = 100 (Excellent: 4x+ return)
 * - >= 2.0 = 75 (Good: 2x+ return)
 * - >= 1.0 = 50 (Break-even)
 * - >= 0.5 = 25 (Below break-even)
 * - < 0.5 = Linear scale 0-25
 *
 * CPA BENCHMARKS (industry avg ~$20-50 depending on vertical):
 * - <= $10 = 100 (Excellent)
 * - <= $25 = 75 (Good)
 * - <= $50 = 50 (Average)
 * - <= $100 = 25 (Poor)
 * - > $100 = Linear inverse scale 0-25
 *
 * CTR BENCHMARKS:
 * - >= 2.0% = 100 (Excellent)
 * - >= 1.0% = 75 (Good)
 * - >= 0.5% = 50 (Average)
 * - >= 0.25% = 25 (Below average)
 * - < 0.25% = Linear scale 0-25
 *
 * FREQUENCY BENCHMARKS (optimal: 1.5-3.0):
 * - 1.5-3.0 = 100 (Optimal range)
 * - 1.0-1.5 or 3.0-5.0 = 75 (Acceptable)
 * - 0.5-1.0 or 5.0-7.0 = 50 (Warning)
 * - < 0.5 or 7.0-10.0 = 25 (Problematic)
 * - >= 10.0 = 10 (Severe saturation)
 *
 * CONVERSION RATE BENCHMARKS:
 * - >= 5.0% = 100 (Excellent)
 * - >= 3.0% = 75 (Good)
 * - >= 1.5% = 50 (Average)
 * - >= 0.5% = 25 (Below average)
 * - < 0.5% = Linear scale 0-25
 *
 * GRADE SCALE:
 * - A+ (90-100): Excellent - Top performer
 * - A (80-89): Very Good - Strong performer
 * - B (70-79): Good - Meeting goals
 * - C (60-69): Average - Needs attention
 * - D (50-59): Poor - Significant issues
 * - F (0-49): Critical - Immediate action required
 */

export type HealthGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
export type HealthTier = 'Excellent' | 'Very Good' | 'Good' | 'Average' | 'Poor' | 'Critical'

export interface FactorScore {
  score: number
  value: number | null
  weight: number
  weightedScore: number
  label: string
}

export interface CampaignHealthScore {
  score: number
  grade: HealthGrade
  tier: HealthTier
  factors: {
    roas: FactorScore
    cpa: FactorScore
    ctr: FactorScore
    frequency: FactorScore
    conversionRate: FactorScore
  }
  metrics: {
    roas: number | null
    cpa: number | null
    ctr: number | null
    frequency: number | null
    conversionRate: number | null
    spend: number
    impressions: number
    clicks: number
    conversions: number
    purchaseValue: number
  }
}

const WEIGHTS = {
  roas: 0.30,
  cpa: 0.25,
  ctr: 0.20,
  frequency: 0.15,
  conversionRate: 0.10,
} as const

/**
 * Score ROAS (Return on Ad Spend)
 * Higher is better
 */
function scoreROAS(roas: number | null): number {
  if (roas === null || roas === 0) return 0

  if (roas >= 4.0) return 100
  if (roas >= 2.0) return 75
  if (roas >= 1.0) return 50
  if (roas >= 0.5) return 25

  // Linear scale for very low ROAS
  return Math.max(0, Math.min(25, roas * 50))
}

/**
 * Score CPA (Cost Per Acquisition)
 * Lower is better, so we invert the relationship
 */
function scoreCPA(cpa: number | null): number {
  if (cpa === null || cpa === Infinity) return 0

  if (cpa <= 10) return 100
  if (cpa <= 25) return 75
  if (cpa <= 50) return 50
  if (cpa <= 100) return 25

  // Linear inverse scale for very high CPA
  // At $200, score approaches 0
  return Math.max(0, Math.min(25, 25 - ((cpa - 100) / 4)))
}

/**
 * Score CTR (Click-Through Rate)
 * Higher is better
 */
function scoreCTR(ctr: number | null): number {
  if (ctr === null || ctr === 0) return 0

  // CTR is passed as percentage (e.g., 1.5 for 1.5%)
  if (ctr >= 2.0) return 100
  if (ctr >= 1.0) return 75
  if (ctr >= 0.5) return 50
  if (ctr >= 0.25) return 25

  // Linear scale for very low CTR
  return Math.max(0, Math.min(25, ctr * 100))
}

/**
 * Score Frequency
 * Optimal range is 1.5-3.0 (not too low, not too high)
 */
function scoreFrequency(frequency: number | null): number {
  if (frequency === null || frequency === 0) return 50 // Default to middle if no data

  // Optimal range: 1.5 to 3.0
  if (frequency >= 1.5 && frequency <= 3.0) return 100

  // Acceptable range: 1.0-1.5 or 3.0-5.0
  if ((frequency >= 1.0 && frequency < 1.5) || (frequency > 3.0 && frequency <= 5.0)) return 75

  // Warning range: 0.5-1.0 or 5.0-7.0
  if ((frequency >= 0.5 && frequency < 1.0) || (frequency > 5.0 && frequency <= 7.0)) return 50

  // Problematic range
  if (frequency < 0.5) return 25
  if (frequency > 7.0 && frequency <= 10.0) return 25

  // Severe saturation
  return 10
}

/**
 * Score Conversion Rate
 * Higher is better
 */
function scoreConversionRate(conversionRate: number | null): number {
  if (conversionRate === null || conversionRate === 0) return 0

  // Conversion rate is passed as percentage (e.g., 2.5 for 2.5%)
  if (conversionRate >= 5.0) return 100
  if (conversionRate >= 3.0) return 75
  if (conversionRate >= 1.5) return 50
  if (conversionRate >= 0.5) return 25

  // Linear scale for very low conversion rates
  return Math.max(0, Math.min(25, conversionRate * 50))
}

/**
 * Convert numeric score to letter grade
 */
function scoreToGrade(score: number): HealthGrade {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

/**
 * Convert numeric score to tier label
 */
function scoreToTier(score: number): HealthTier {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Very Good'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Average'
  if (score >= 50) return 'Poor'
  return 'Critical'
}

/**
 * Calculate health score for a campaign based on aggregated metrics
 */
export function calculateHealthScore(metrics: {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  purchaseValue: number
  reach?: number
}): CampaignHealthScore {
  // Calculate derived metrics
  const roas = metrics.spend > 0 ? metrics.purchaseValue / metrics.spend : null
  const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : null
  const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : null
  const frequency = metrics.reach && metrics.reach > 0 ? metrics.impressions / metrics.reach : null
  const conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : null

  // Score each factor
  const roasScore = scoreROAS(roas)
  const cpaScore = scoreCPA(cpa)
  const ctrScore = scoreCTR(ctr)
  const frequencyScore = scoreFrequency(frequency)
  const conversionRateScore = scoreConversionRate(conversionRate)

  // Calculate weighted scores
  const factors = {
    roas: {
      score: roasScore,
      value: roas,
      weight: WEIGHTS.roas,
      weightedScore: roasScore * WEIGHTS.roas,
      label: 'ROAS (Return on Ad Spend)',
    },
    cpa: {
      score: cpaScore,
      value: cpa,
      weight: WEIGHTS.cpa,
      weightedScore: cpaScore * WEIGHTS.cpa,
      label: 'CPA (Cost Per Acquisition)',
    },
    ctr: {
      score: ctrScore,
      value: ctr,
      weight: WEIGHTS.ctr,
      weightedScore: ctrScore * WEIGHTS.ctr,
      label: 'CTR (Click-Through Rate)',
    },
    frequency: {
      score: frequencyScore,
      value: frequency,
      weight: WEIGHTS.frequency,
      weightedScore: frequencyScore * WEIGHTS.frequency,
      label: 'Frequency (Ad Exposure)',
    },
    conversionRate: {
      score: conversionRateScore,
      value: conversionRate,
      weight: WEIGHTS.conversionRate,
      weightedScore: conversionRateScore * WEIGHTS.conversionRate,
      label: 'Conversion Rate',
    },
  }

  // Calculate total score (sum of weighted scores)
  const totalScore = Math.round(
    factors.roas.weightedScore +
    factors.cpa.weightedScore +
    factors.ctr.weightedScore +
    factors.frequency.weightedScore +
    factors.conversionRate.weightedScore
  )

  return {
    score: totalScore,
    grade: scoreToGrade(totalScore),
    tier: scoreToTier(totalScore),
    factors,
    metrics: {
      roas,
      cpa,
      ctr,
      frequency,
      conversionRate,
      spend: metrics.spend,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      conversions: metrics.conversions,
      purchaseValue: metrics.purchaseValue,
    },
  }
}

/**
 * Format score for display with color class
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/30'
  if (score >= 60) return 'bg-amber-500/10 border-amber-500/30'
  return 'bg-red-500/10 border-red-500/30'
}

export function getGradeColor(grade: HealthGrade): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    case 'B':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/30'
    case 'C':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/30'
    case 'D':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/30'
    case 'F':
      return 'text-red-500 bg-red-500/10 border-red-500/30'
  }
}
