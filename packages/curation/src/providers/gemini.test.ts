import { describe, expect, it } from "vitest";
import { toGeminiSchema } from "./gemini";
import { CLUSTER_SCHEMA, POSTS_SCHEMA } from "../prompts";

describe("toGeminiSchema", () => {
  it("remove additionalProperties e preserva required", () => {
    const out = toGeminiSchema({
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
      additionalProperties: false,
    });
    expect(out).toEqual({
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
    });
  });

  it("converte type union com null em nullable", () => {
    expect(toGeminiSchema({ type: ["string", "null"] })).toEqual({
      type: "string",
      nullable: true,
    });
    expect(toGeminiSchema({ type: ["array", "null"], items: { type: "integer" } })).toEqual({
      type: "array",
      nullable: true,
      items: { type: "integer" },
    });
  });

  it("mantém enum apenas em strings (enums numéricos são rejeitados pela API)", () => {
    expect(toGeminiSchema({ type: "string", enum: ["a", "b"] })).toEqual({
      type: "string",
      enum: ["a", "b"],
    });
    expect(toGeminiSchema({ type: "integer", enum: [0, 1, 2, 3] })).toEqual({
      type: "integer",
    });
  });

  it("converte os schemas reais do pipeline sem perder estrutura", () => {
    const cluster = toGeminiSchema(CLUSTER_SCHEMA as unknown as Record<string, unknown>);
    const clusterItem = (cluster.properties as Record<string, Record<string, unknown>>)
      .clusters!.items as Record<string, unknown>;
    expect(clusterItem.required).toContain("relevancia_empresarial");
    expect(JSON.stringify(cluster)).not.toContain("additionalProperties");

    const posts = toGeminiSchema(POSTS_SCHEMA as unknown as Record<string, unknown>);
    const postItem = (posts.properties as Record<string, Record<string, unknown>>)
      .posts!.items as Record<string, unknown>;
    // campos nullable do schema de posts viram nullable:true
    const props = postItem.properties as Record<string, Record<string, unknown>>;
    expect(props.skip_motivo).toEqual({ type: "string", nullable: true });
    expect(props.estrutura!.nullable).toBe(true);
  });
});
