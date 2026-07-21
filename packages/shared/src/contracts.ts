export type ProjectStatus = "draft" | "generating" | "ready" | "failed" | "archived";
export type GenerationStatus = "draft" | "queued" | "running" | "completed" | "failed";
export type FileKind = "rtl" | "testbench" | "constraints" | "script" | "readme";

export interface DesignVersion {
  id: string;
  number: number;
  sourcePrompt: string;
  architecture: Record<string, unknown>;
  generationStatus: GenerationStatus;
  createdAt: string;
}

export interface DesignFile {
  id: string;
  path: string;
  language: string;
  kind: FileKind;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  prompt: string;
  status: ProjectStatus;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  version: DesignVersion | null;
}

export interface CreateProjectRequest { name?: string; prompt: string; }
export interface CreateProjectResponse { project: Project; }

export type SimulationStatus = "queued" | "running" | "passed" | "failed" | "cancelled";

export interface SimulationRun {
  id: string;
  versionId: string;
  status: SimulationStatus;
  runner: string;
  summary: Record<string, unknown>;
  logs: string;
  vcdContent: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AutoFixAttempt {
  id: string;
  status: "queued" | "running" | "proposed" | "applied" | "failed";
  diagnosis: string | null;
  patch: Array<Pick<DesignFile, "path" | "kind" | "content">>;
  resultVersionId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export type AiUsageOperation = "architecture" | "rtl" | "auto_fix";

export interface AiUsageEvent {
  id: string;
  projectId: string;
  versionId: string | null;
  autoFixAttemptId: string | null;
  operation: AiUsageOperation;
  provider: "azure" | "openai";
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  createdAt: string;
}

export interface ProjectAiUsage {
  summary: {
    requestCount: number;
    usageReportedCount: number;
    usageMissingCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  events: AiUsageEvent[];
}
