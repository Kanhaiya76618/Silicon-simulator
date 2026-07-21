import type { AutoFixAttempt, CreateProjectResponse, DesignFile, DesignVersion, FileKind, Project, ProjectAiUsage, SimulationRun } from "@silicon-canvas/shared/contracts";

export interface GeneratedDesignResponse {
  project: Project;
  architecture: Record<string, unknown>;
  files: DesignFile[];
}

function formatApiBaseUrl(rawUrl?: string): string {
  if (!rawUrl) return "http://localhost:8080";
  const trimmed = rawUrl.trim().replace(/\/$/, "");
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

const apiBaseUrl = formatApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.error?.message ?? `API request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return body as T;
}

export async function createProject(prompt: string): Promise<Project> {
  const response = await request<CreateProjectResponse>("/api/projects", { method: "POST", body: JSON.stringify({ prompt }) });
  return response.project;
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await request<{ project: Project }>(`/api/projects/${projectId}`);
  return response.project;
}

export async function listProjects(): Promise<Project[]> {
  const response = await request<{ projects: Project[] }>("/api/projects");
  return response.projects;
}

export async function getVersionFiles(projectId: string, versionId: string): Promise<DesignFile[]> {
  const response = await request<{ files: DesignFile[] }>(`/api/projects/${projectId}/versions/${versionId}`);
  return response.files;
}

export async function listProjectVersions(projectId: string): Promise<DesignVersion[]> {
  const response = await request<{ versions: DesignVersion[] }>(`/api/projects/${projectId}/versions`);
  return response.versions;
}

export function getProjectAiUsage(projectId: string): Promise<ProjectAiUsage> {
  return request<ProjectAiUsage>(`/api/projects/${projectId}/usage`);
}

export async function askMentor(projectId: string, question: string): Promise<string> {
  const response = await request<{ answer: string }>(`/api/projects/${projectId}/mentor`, { method: "POST", body: JSON.stringify({ question }) });
  return response.answer;
}

export async function restoreProjectVersion(projectId: string, versionId: string): Promise<Project> {
  const response = await request<{ project: Project }>(`/api/projects/${projectId}/versions/${versionId}/restore`, { method: "POST" });
  return response.project;
}

export async function createVersion(projectId: string, prompt: string): Promise<Project> {
  const response = await request<CreateProjectResponse>(`/api/projects/${projectId}/versions`, { method: "POST", body: JSON.stringify({ prompt, copyFiles: false }) });
  return response.project;
}

export function generateProject(projectId: string): Promise<GeneratedDesignResponse> {
  return request<GeneratedDesignResponse>(`/api/projects/${projectId}/generate`, { method: "POST" });
}

export async function saveDesignFile(projectId: string, versionId: string, path: string, content: string, kind: FileKind = "rtl"): Promise<DesignFile> {
  const response = await request<{ file: DesignFile }>(`/api/projects/${projectId}/versions/${versionId}/files/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "PUT",
    body: JSON.stringify({ content, language: path.endsWith(".json") ? "json" : "verilog", kind }),
  });
  return response.file;
}

export async function runProjectSimulation(projectId: string, versionId: string): Promise<SimulationRun> {
  const response = await request<{ simulation: SimulationRun }>(`/api/projects/${projectId}/versions/${versionId}/simulate`, { method: "POST" });
  return response.simulation;
}

export interface AutoFixResponse {
  project: Project;
  files: DesignFile[];
  autoFix: AutoFixAttempt;
  rerun: SimulationRun;
}

export function autoFixSimulation(projectId: string, simulationId: string): Promise<AutoFixResponse> {
  return request<AutoFixResponse>(`/api/projects/${projectId}/simulations/${simulationId}/auto-fix`, { method: "POST" });
}

export interface FpgaExport {
  id: string;
  versionId: string;
  board: string;
  status: string;
  artifacts: Array<{ path: string; content: string }>;
}

export async function createFpgaExport(projectId: string, versionId: string, board: string): Promise<FpgaExport> {
  const response = await request<{ export: FpgaExport }>(`/api/projects/${projectId}/versions/${versionId}/exports`, { method: "POST", body: JSON.stringify({ board }) });
  return response.export;
}
