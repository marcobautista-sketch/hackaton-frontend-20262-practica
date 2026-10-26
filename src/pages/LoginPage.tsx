import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthShell, Field, GeneralError, SubmitButton } from "../auth/AuthShell";
import { NO_ERRORS, toFormErrors, type FormErrors } from "../auth/formErrors";
import { useAuth } from "../auth/useAuth";

/** Ruta a la que el usuario queria entrar antes de que lo mandaran al login. */
interface FromState {
  from?: { pathname: string; search?: string };
}

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [pending, setPending] = useState(false);

  const state = location.state as FromState | null;
  const from = state?.from
    ? `${state.from.pathname}${state.from.search ?? ""}`
    : "/dashboard";

  // Si ya hay sesion, no tiene sentido ver el login.
  if (status === "authenticated") return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors(NO_ERRORS);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Log Pose Console"
      subtitle="Entra con el correo y la clave de tu tripulacion."
      footer={
        <>
          Aun no tienen tripulacion?{" "}
          <Link to="/register" className="font-medium text-amber-400 hover:underline">
            Registrarla
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <GeneralError message={errors.general} />

        <Field
          id="email"
          label="Correo de la tripulacion"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.fields.email}
          autoComplete="email"
          disabled={pending}
        />

        <Field
          id="password"
          label="Contrasena"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.fields.password}
          autoComplete="current-password"
          disabled={pending}
        />

        <SubmitButton pending={pending}>Zarpar</SubmitButton>
      </form>
    </AuthShell>
  );
}
