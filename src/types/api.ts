// Tipos calcados del contrato publico: https://logpose-api-jg7f.onrender.com/docs
// Si algo no coincide con Swagger, manda Swagger.

export type WantedStatus = "AT_LARGE" | "CAPTURED" | "MISSING";
export type FruitType = "PARAMECIA" | "ZOAN" | "LOGIA";
export type FruitFilter = FruitType | "NONE";
export type LogPoseStatus = "LOCKED" | "UNLOCKED";

export type CrewRole =
  | "CAPTAIN" | "FIRST_MATE" | "NAVIGATOR" | "SNIPER" | "COOK" | "DOCTOR"
  | "SHIPWRIGHT" | "MUSICIAN" | "ARCHAEOLOGIST" | "HELMSMAN" | "FIGHTER";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Team {
  code: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  teamName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: "Bearer";
  expiresAt: string;
  user: User;
  team: Team;
}

export interface MeResponse {
  user: User;
  team: Team;
  expiresAt: string;
}

export interface CrewRef {
  id: string;
  name: string;
}

export interface DevilFruit {
  name: string;
  type: FruitType;
}

export interface WantedSummary {
  id: string;
  name: string;
  epithet: string;
  bounty: number;
  status: WantedStatus;
  crew: CrewRef;
  role: CrewRole;
  devilFruit: DevilFruit | null;
  threatLevel: number;
  lastSeenIsland: string;
  updatedAt: string;
}

export interface WantedDetail extends WantedSummary {
  age: number;
  heightCm: number;
  bio: string;
  lastSeen: string;
  bountyHistory: { bounty: number; at: string }[];
}

export interface WantedPage {
  content: WantedSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface DashboardSummary {
  team: Team;
  wanted: {
    total: number;
    totalBounty: number;
    averageBounty: number;
    byStatus: Record<WantedStatus, number>;
    byFruit: Record<FruitFilter, number>;
  };
  crews: number;
  topBounties: WantedSummary[];
  generatedAt: string;
}

export interface LogPose {
  status: LogPoseStatus;
  grandLineUnlocked: boolean;
  unlockedAt: string | null;
  message: string;
}

export interface Crew {
  id: string;
  name: string;
  shipName: string;
  jollyRogerColor: string;
  memberCount: number;
  totalBounty: number;
}

export type WantedSort = "bounty,desc" | "name,asc" | "updatedAt,desc";

export const WANTED_SORTS: WantedSort[] = ["bounty,desc", "name,asc", "updatedAt,desc"];
export const WANTED_SIZES = [10, 20, 50] as const;
export const WANTED_STATUSES: WantedStatus[] = ["AT_LARGE", "CAPTURED", "MISSING"];
export const FRUIT_FILTERS: FruitFilter[] = ["PARAMECIA", "ZOAN", "LOGIA", "NONE"];

/** Formato unico de error de toda la API. */
export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  traceId: string;
  details?: { field: string; message: string }[];
}
