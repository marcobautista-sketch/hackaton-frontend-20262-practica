import { ApiError } from "../lib/api";

export interface FormErrors {
  /** Mensaje por campo, para pintarlo debajo del input que corresponde. */
  fields: Record<string, string>;
  /** Mensaje general cuando el error no apunta a un campo concreto. */
  general: string | null;
}

export const NO_ERRORS: FormErrors = { fields: {}, general: null };

/**
 * Traduce un error de la API a errores de formulario.
 *
 * - `400 VALIDATION_ERROR` trae `details: [{ field, message }]` -> va a cada campo.
 * - Codigos como EMAIL_ALREADY_REGISTERED no traen `details`, asi que los
 *   mapeamos nosotros al campo correspondiente con `codeToField`.
 */
export function toFormErrors(
  error: unknown,
  codeToField: Record<string, string> = {}
): FormErrors {
  if (error instanceof ApiError) {
    if (error.details.length > 0) {
      const fields: Record<string, string> = {};
      for (const d of error.details) fields[d.field] = d.message;
      return { fields, general: null };
    }

    const field = codeToField[error.code];
    if (field) return { fields: { [field]: error.message }, general: null };

    return { fields: {}, general: error.message };
  }

  return { fields: {}, general: "No se pudo contactar al servidor. Intentalo de nuevo." };
}
