import { Link } from "react-router-dom";
import { EmptyState } from "../components/StateViews";

/** 423 LOG_POSE_REQUIRED: no es un error que se arregle reintentando. */
export function LockedState() {
  return (
    <EmptyState
      title="Sin Log Pose no hay Grand Line"
      description="Las sagas se desbloquean cuando la tripulacion aprueba la inspeccion de Reverse Mountain."
      action={
        <Link to="/dashboard" className="text-sm font-semibold text-amber-300 underline">
          Ver el estado del Log Pose
        </Link>
      }
    />
  );
}
