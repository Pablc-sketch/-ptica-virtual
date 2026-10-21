// Revisión DOCUMENTAL: refleja la migración aplicada 20261021192923_revision_documental_recetas.sql.
// "Revisión completada" = el equipo comprobó que el archivo se puede leer y trae los datos necesarios para preparar una
// cotización. NO valida, aprueba ni corrige la graduación (no es un acto clínico) y no activa pagos ni compras.

export const REVIEW_STATUSES = ["pending", "in_review", "needs_new_file", "reviewed"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  pending: ["in_review"],
  in_review: ["pending", "needs_new_file", "reviewed"],
  needs_new_file: [],
  reviewed: [],
};

export const isReviewStatus = (v: unknown): v is ReviewStatus =>
  typeof v === "string" && (REVIEW_STATUSES as readonly string[]).includes(v);

export const allowedTransitions = (from: ReviewStatus): ReviewStatus[] => TRANSITIONS[from];
export const canTransition = (from: ReviewStatus, to: ReviewStatus) => TRANSITIONS[from].includes(to);

/** Texto para la persona cliente. Nunca promete aprobación médica ni compra. */
export const CLIENT_LABEL: Record<ReviewStatus, { title: string; detail: string }> = {
  pending: { title: "Recibida", detail: "Tu receta está en la fila para que una persona del equipo la revise." },
  in_review: { title: "En revisión", detail: "Una persona del equipo está revisando que el archivo se pueda leer y traiga los datos necesarios." },
  needs_new_file: { title: "Necesitamos un nuevo archivo", detail: "Revisa el motivo y sube un archivo nuevo para continuar." },
  reviewed: {
    title: "Revisión documental completada",
    detail:
      "Revisamos que el archivo se pueda leer y traiga los datos necesarios para preparar tu cotización. No es una evaluación médica: no valida ni corrige tu graduación, y no confirma una compra.",
  },
};

/** Acciones del panel admin, con el verbo de la transición. */
export const ADMIN_ACTION: Record<ReviewStatus, string> = {
  pending: "Liberar (volver a la fila)",
  in_review: "Tomar para revisar",
  needs_new_file: "Pedir nuevo archivo",
  reviewed: "Marcar revisión documental completada",
};

export const ADMIN_LABEL: Record<ReviewStatus, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  needs_new_file: "Requiere nuevo archivo",
  reviewed: "Revisión completada",
};

export const REASON_MIN = 5;
export const REASON_MAX = 300;

export function validateReason(to: ReviewStatus, reason: string | null | undefined): string | null {
  if (to !== "needs_new_file") return null;
  const r = (reason ?? "").trim();
  if (r.length < REASON_MIN) return `Escribe un motivo visible para la persona (mínimo ${REASON_MIN} caracteres).`;
  if (r.length > REASON_MAX) return `El motivo no puede superar ${REASON_MAX} caracteres.`;
  return null;
}

/** Traduce los errores de review_prescription() (mensaje de la excepción) a un resultado de API. */
export function reviewErrorToResponse(message: string | undefined): { status: number; error: string } {
  switch (message) {
    case "not_admin":
      return { status: 403, error: "Solo un administrador puede revisar recetas." };
    case "not_found":
      return { status: 404, error: "La receta ya no existe (pudo ser eliminada por su dueña o dueño)." };
    case "version_conflict":
      return { status: 409, error: "Otra persona cambió esta receta. Recarga para ver su estado actual." };
    case "invalid_transition":
      return { status: 409, error: "Ese cambio de estado no está permitido desde el estado actual." };
    case "reason_required":
      return { status: 400, error: `El motivo es obligatorio (${REASON_MIN}-${REASON_MAX} caracteres).` };
    case "history_limit":
      return { status: 409, error: "Esta receta alcanzó el límite de cambios de estado." };
    default:
      return { status: 502, error: "No pudimos actualizar la receta. Intenta nuevamente." };
  }
}
