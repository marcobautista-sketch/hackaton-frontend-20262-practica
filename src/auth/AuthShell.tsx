import type { ReactNode } from "react";

/** Marco visual compartido por login y registro. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
            Guild de Cazarrecompensas
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">{footer}</p>
      </div>
    </div>
  );
}

export function Field({
  id,
  label,
  type,
  value,
  onChange,
  error,
  hint,
  autoComplete,
  disabled,
}: {
  id: string;
  label: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full rounded-lg border bg-slate-950 px-3 py-2 text-slate-100 outline-none transition",
          "placeholder:text-slate-600 disabled:opacity-50",
          error
            ? "border-rose-500 focus:border-rose-400"
            : "border-slate-700 focus:border-amber-400",
        ].join(" ")}
      />
      {/* Altura reservada: el formulario no salta cuando aparece el error. */}
      <div className="min-h-[1.25rem] pt-1">
        {error ? (
          <p id={errorId} className="text-xs text-rose-400">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando..." : children}
    </button>
  );
}

export function GeneralError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-300"
    >
      {message}
    </div>
  );
}
