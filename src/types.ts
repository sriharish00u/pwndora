export interface Stage {
  id: number;
  name: string;
  category: "Auth/Authz" | "Injection" | "SSRF/Server-side" | "Privilege Escalation";
  vulnerability: string;
  description: string;
  hints: string[];
  flag: string;
  points: number;
  owaspCategory: string;
  mitreTechnique: string;
  cweId: string;
  cvssScore: number;
  cvssVector: string;
}

export interface HackerLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  payload: string;
  response: string;
  status: "SUCCESS" | "FAILED" | "INFO";
}

export interface User {
  _id?: string;
  email: string;
  password: string;
  displayName: string;
  role: "player" | "admin";
  createdAt: Date;
  lastLogin: Date | null;
}

export interface SessionState {
  sessionId: string;
  userId: string | null;
  username: string;
  startTime: number;
  endTime: number | null;
  currentStage: number; // 1 to 4
  completedStages: number[]; // e.g. [1, 2]
  flagsFound: string[]; // actual flags submitted
  hintsUsed: number[]; // stage IDs where hint was viewed
  hintsByStage: Record<number, number[]>; // stage ID -> indices of hints revealed (0,1,2)
  stageArtifacts: Record<number, string>; // stage ID -> signed artifact token
  logs: HackerLog[];
}

export interface LeaderboardEntry {
  name: string;
  stagesCompleted: number;
  timeElapsed: string;
  score: number;
  isUser?: boolean;
}

export interface PentestReport {
  title: string;
  target: string;
  executiveSummary: string;
  stages: {
    id: number;
    name: string;
    category: string;
    description: string;
    impact: "High" | "Critical" | "Medium";
    exploitPoC: string;
    remediation: string;
    status: "Exploited" | "Unresolved";
    owaspCategory: string;
    mitreTechnique: string;
    cweId: string;
    cvssScore: number;
    cvssVector: string;
  }[];
  overallImpact: string;
  recommendations: string[];
  generatedAt: string;
}
