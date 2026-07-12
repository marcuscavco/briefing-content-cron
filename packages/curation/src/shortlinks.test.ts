import { describe, expect, it } from "vitest";
import { generateShortCode } from "./shortlinks";

describe("generateShortCode", () => {
  it("gera códigos de 7 chars sem caracteres ambíguos (0/O/1/l/I)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateShortCode();
      expect(code).toMatch(/^[A-HJ-NP-Za-km-z2-9]{7}$/);
      expect(code).not.toMatch(/[0O1lI]/);
    }
  });

  it("não repete em amostra razoável", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateShortCode()));
    expect(seen.size).toBe(500);
  });
});
