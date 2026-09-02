import { z } from "zod";

export const createRequestSchema = z
  .object({
    requester_name: z.string().min(2, "Nome muito curto").max(200, "Nome muito longo"),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    event_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
    alternative_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data alternativa inválida")
      .nullable()
      .optional(),
    only_requested_date: z.boolean().optional().default(false),
    quantity: z.number().int().positive(),
    instagram: z.string().min(2, "Informe o Instagram").max(200, "Instagram muito longo"),
    whatsapp: z.string().min(8, "Informe um WhatsApp válido").max(50, "WhatsApp muito longo"),
    terms_accepted: z.literal(true, {
      errorMap: () => ({ message: "É preciso concordar com as regras da casa" }),
    }),
    referred_by_profile_id: z.string().uuid().nullable().optional(),
  })
  .transform((data) => ({
    ...data,
    alternative_date: data.only_requested_date ? null : data.alternative_date || null,
  }));

export const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve") }),
  z.object({
    decision: z.literal("deny"),
    denial_reason: z.string().min(3, "Informe o motivo").max(2000, "Motivo muito longo"),
  }),
]);

export const classificationSchema = z
  .object({
    type: z.enum(["tudo_vip", "vip_ate_hora", "valor_genero", "pagar_antecipado"]),
    vip_until_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    value_male: z.number().nonnegative().optional(),
    value_female: z.number().nonnegative().optional(),
    advance_payment_note: z.string().max(2000, "Observação muito longa").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "vip_ate_hora" && !data.vip_until_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vip_until_time"],
        message: "Informe até que horário vale o VIP",
      });
    }
    if (data.type === "valor_genero") {
      if (data.value_male === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value_male"],
          message: "Informe o valor para homens",
        });
      }
      if (data.value_female === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value_female"],
          message: "Informe o valor para mulheres",
        });
      }
    }
  });

export const guestListSchema = z.object({
  max_men: z.number().int().nonnegative(),
  max_women: z.number().int().nonnegative(),
  deadline_at: z.string().datetime({ message: "Data limite inválida" }),
});

export const guestListEntrySchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(200, "Nome muito longo"),
  gender: z.enum(["male", "female"]),
});

export const houseRulesSchema = z.object({
  content: z.string(),
});
