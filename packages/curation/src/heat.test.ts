import { describe, expect, it } from "vitest";
import { categorize, computeTrendBoost, DEFAULT_TREND, DEFAULT_WEIGHTS, type TrendState } from "./heat";

const NOW = new Date("2026-07-11T10:00:00Z");

function state(over: Partial<TrendState> = {}): TrendState {
  return {
    noveltyStreak: 1,
    staleDays: 0,
    lastNovelAt: "2026-07-10T10:00:00Z", // ontem — dentro da carência
    ...over,
  };
}

describe("computeTrendBoost", () => {
  it("1ª atualização quente = boost base (+2)", () => {
    expect(computeTrendBoost(state(), NOW)).toBe(2);
  });

  it("streak de atualizações soma até o teto (+3)", () => {
    expect(computeTrendBoost(state({ noveltyStreak: 2 }), NOW)).toBe(3);
    // streak 5 capado em streakCap=3 → mesmo boost do streak 3, limitado a maxBoost
    expect(computeTrendBoost(state({ noveltyStreak: 5 }), NOW)).toBe(DEFAULT_TREND.maxBoost);
  });

  it("dias reaparecendo sem novidade decaem — volta mais frio", () => {
    expect(computeTrendBoost(state({ staleDays: 1 }), NOW)).toBe(1);
    expect(computeTrendBoost(state({ staleDays: 2 }), NOW)).toBe(0);
    // 3+ dias requentados: clampa na penalidade mínima (−1)
    expect(computeTrendBoost(state({ staleDays: 3 }), NOW)).toBe(-1);
    expect(computeTrendBoost(state({ staleDays: 10 }), NOW)).toBe(DEFAULT_TREND.minBoost);
  });

  it("tempo parado além da carência de 2 dias também decai", () => {
    // 2 dias sem novidade: dentro da carência, sem decaimento
    expect(computeTrendBoost(state({ lastNovelAt: "2026-07-09T10:00:00Z" }), NOW)).toBe(2);
    // 4 dias: 2 além da carência → −1
    expect(computeTrendBoost(state({ lastNovelAt: "2026-07-07T10:00:00Z" }), NOW)).toBe(1);
    // 8 dias: 6 além da carência → clampa no mínimo
    expect(computeTrendBoost(state({ lastNovelAt: "2026-07-03T10:00:00Z" }), NOW)).toBe(
      DEFAULT_TREND.minBoost,
    );
  });

  it("lastNovelAt inválido não explode nem decai", () => {
    expect(computeTrendBoost(state({ lastNovelAt: "nunca" }), NOW)).toBe(2);
  });

  it("boost promove categoria via categorize(heat + boost)", () => {
    const heat = 4; // relevante (3-5)
    expect(categorize(heat, DEFAULT_WEIGHTS)).toBe("relevante");
    const boost = computeTrendBoost(state(), NOW); // +2
    expect(categorize(heat + Math.round(boost), DEFAULT_WEIGHTS)).toBe("must_read");
    // no_radar (2) + 2 → relevante
    expect(categorize(2 + Math.round(boost), DEFAULT_WEIGHTS)).toBe("relevante");
  });

  it("badge Em alta quando boost ≥ badgeThreshold", () => {
    expect(computeTrendBoost(state(), NOW) >= DEFAULT_TREND.badgeThreshold).toBe(true);
    expect(computeTrendBoost(state({ staleDays: 2 }), NOW) >= DEFAULT_TREND.badgeThreshold).toBe(
      false,
    );
  });
});
