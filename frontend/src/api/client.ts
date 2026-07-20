import type { CreateProjectResponse, DesignFile, Project } from "@silicon-canvas/shared/contracts";

export interface GeneratedDesignResponse {
  project: Project;
  architecture: Record<string, unknown>;
  files: DesignFile[];
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

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
  const response = await request<CreateProjectResponse>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
  return response.project;
}

export async function createVersion(projectId: string, prompt: string): Promise<Project> {
  const response = await request<CreateProjectResponse>(`/api/projects/${projectId}/versions`, {
    method: "POST",
    body: JSON.stringify({ prompt, copyFiles: false }),
  });
  return response.project;
}

export function generateProject(projectId: string): Promise<GeneratedDesignResponse> {
  return request<GeneratedDesignResponse>(`/api/projects/${projectId}/generate`, { method: "POST" });
}

export interface FpgaExport {
  id: string;
  versionId: string;
  board: string;
  status: string;
  artifacts: Array<{ path: string; content: string }>;
}

export async function createFpgaExport(projectId: string, versionId: string, board: string): Promise<FpgaExport> {
  const response = await request<{ export: FpgaExport }>(`/api/projects/${projectId}/versions/${versionId}/exports`, {
    method: "POST",
    body: JSON.stringify({ board }),
  });
  return response.export;
}
