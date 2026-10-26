import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthShell, Field, GeneralError, SubmitButton } from "../auth/AuthShell";
import { NO_ERRORS, toFormErrors, type FormErrors } from "../auth/formErrors";
import { useAuth } from "../auth/useAuth";

/**
 * Estos codigos de error no traen `details`, asi que los llevamos nosotros
 * al campo que les corresponde.
 */
const CODE_TO_FIELD: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: "email",
  TEAM_NAME_TAKEN: "teamName",
};

export default function RegisterPage() {
  const { status, register } = useAuth();
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [pending, setPending] = useState(false);

  if (status === "authenticated") return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors(NO_ERRORS);
    try {
      // El registro devuelve token: se entra directo, sin pasar por el login.
      await register(teamName.trim(), email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrors(toFormErrors(error, CODE_TO_FIELD));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Registrar tripulacion"
      subtitle="Una cuenta por equipo. Los tres integrantes entran con el mismo correo."
      footer={
        <>
          Ya tienen tripulacion?{" "}
          <Link to="/login" className="font-medium text-amber-400 hover:underline">
            Iniciar sesion
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <GeneralError message={errors.general} />

        <Field
          id="teamName"
          label="Nombre de la tripulacion"
          type="text"
          value={teamName}
          onChange={setTeamName}
          error={errors.fields.teamName}
          hint="Entre 3 y 40 caracteres."
          autoComplete="organization"
          disabled={pending}
        />

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
          hint="Entre 8 y 72 caracteres."
          autoComplete="new-password"
          disabled={pending}
        />

        <SubmitButton pending={pending}>Crear tripulacion</SubmitButton>
      </form>
    </AuthShell>
  );
}
