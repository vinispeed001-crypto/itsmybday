import { describe, it, expect } from "vitest";
import { classificationSchema } from "@/lib/validation/schemas";

describe("classificationSchema", () => {
  it("accepts tudo_vip with no extra fields", () => {
    const result = classificationSchema.safeParse({ type: "tudo_vip" });
    expect(result.success).toBe(true);
  });

  it("requires vip_until_time for vip_ate_hora", () => {
    const result = classificationSchema.safeParse({ type: "vip_ate_hora" });
    expect(result.success).toBe(false);
  });

  it("accepts vip_ate_hora with vip_until_time", () => {
    const result = classificationSchema.safeParse({
      type: "vip_ate_hora",
      vip_until_time: "23:00",
    });
    expect(result.success).toBe(true);
  });

  it("requires value_male and value_female for valor_genero", () => {
    const result = classificationSchema.safeParse({ type: "valor_genero" });
    expect(result.success).toBe(false);
  });

  it("accepts valor_genero with both values", () => {
    const result = classificationSchema.safeParse({
      type: "valor_genero",
      value_male: 200,
      value_female: 100,
    });
    expect(result.success).toBe(true);
  });

  it("accepts pagar_antecipado with an optional note", () => {
    const result = classificationSchema.safeParse({
      type: "pagar_antecipado",
      advance_payment_note: "Pix até sexta",
    });
    expect(result.success).toBe(true);
  });
});
