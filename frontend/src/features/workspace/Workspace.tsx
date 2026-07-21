import Editor from "@monaco-editor/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { autoFixSimulation, createFpgaExport, createProject, createVersion, generateProject, getProject, getProjectAiUsage, getVersionFiles, listProjectVersions, restoreProjectVersion, runProjectSimulation, saveDesignFile, type FpgaExport } from "../../api/client";
import type { DesignVersion, Project, ProjectAiUsage } from "@silicon-canvas/shared/contracts";
import { useHardwareStore } from "../../store/hardwareStore";
import { AgentMissionControl } from "../agents/AgentMissionControl";
import { ArchitecturePanel } from "../architecture/ArchitecturePanel";
import { CircuitDesigner } from "../designer/CircuitDesigner";
import type { CircuitGraph, CompileResult } from "../designer/netlistCompiler";
import { RtlGatesPanel } from "../gates/RtlGatesPanel";
import { ProjectPanel } from "../project/ProjectPanel";
import { WaveformPanel } from "../waveform/WaveformPanel";

type Tab = "studio" | "designer" | "architecture" | "gates" | "waveforms" | "project" | "copilot";

const activeProjectStorageKey = "silicon-canvas.active-project-id";

const starterRtl = `// Deterministic local preview. Connect the API to generate a project-specific design.
module alu4 (
  input wire [3:0] a, b,
  input wire [1:0] op,
  output reg [3:0] result,
  output reg overflow
);
  always @* begin
    overflow = 1'b0;
    case (op)
      2'b00: result = a + b;
      2'b01: result = a - b;
      2'b10: result = a & b;
      default: result = a ^ b;
    endcase
  end
endmodule
`;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The API request could not be completed.";
}

export function Workspace() {
  const prompt = useHardwareStore((state) => state.prompt);
  const setPrompt = useHardwareStore((state) => state.setPrompt);
  const verilogCode = useHardwareStore((state) => state.verilogCode);
  const setVerilogCode = useHardwareStore((state) => state.setVerilogCode);
  const isGenerating = useHardwareStore((state) => state.isGenerating);
  const setIsGenerating = useHardwareStore((state) => state.setIsGenerating);
  const project = useHardwareStore((state) => state.project);
  const setProject = useHardwareStore((state) => state.setProject);
  const files = useHardwareStore((state) => state.files);
  const setFiles = useHardwareStore((state) => state.setFiles);
  const graphData = useHardwareStore((state) => state.graphData);
  const setGraphData = useHardwareStore((state) => state.setGraphData);
  const setGenerationError = useHardwareStore((state) => state.setGenerationError);
  const simulationData = useHardwareStore((state) => state.simulationData);
  const setSimulationData = useHardwareStore((state) => state.setSimulationData);
  const [activeTab, setActiveTab] = useState<Tab>("studio");
  const [toast, setToast] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [usage, setUsage] = useState<ProjectAiUsage | null>(null);
  const [exportResult, setExportResult] = useState<FpgaExport | null>(null);
  const editedSinceSave = useRef(false);

  const sourceName = useMemo(() => files.find((file) => file.kind === "rtl")?.path ?? "schematic_top.v", [files]);

  const adoptMentorProject = useCallback((nextProject: Project) => {
    setProject(nextProject);
    window.localStorage.setItem(activeProjectStorageKey, nextProject.id);
    setToast("Project context created for the Mentor.");
  }, [setProject]);

  const refreshProjectDetails = useCallback(async () => {
    if (!project) {
      setVersions([]);
      setUsage(null);
      return;
    }
    try {
      const [nextVersions, nextUsage] = await Promise.all([listProjectVersions(project.id), getProjectAiUsage(project.id)]);
      setVersions(nextVersions);
      setUsage(nextUsage);
    } catch (error) {
      setToast(`Project details could not be loaded: ${errorMessage(error)}`);
    }
  }, [project]);

  useEffect(() => { void refreshProjectDetails(); }, [refreshProjectDetails]);

  const saveActiveRtl = useCallback(async (silent = false) => {
    if (!project?.activeVersionId) {
      if (!silent) setToast("Generate a project version before saving RTL.");
      return false;
    }
    setIsSaving(true);
    try {
      const savedFile = await saveDesignFile(project.id, project.activeVersionId, sourceName, verilogCode);
      setFiles([...files.filter((file) => file.path !== savedFile.path), savedFile]);
      editedSinceSave.current = false;
      if (!silent) setToast("RTL saved to the active project version.");
      return true;
    } catch (error) {
      setToast(`RTL could not be saved: ${errorMessage(error)}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [files, project, setFiles, sourceName, verilogCode]);

  useEffect(() => {
    const savedProjectId = window.localStorage.getItem(activeProjectStorageKey);
    if (!savedProjectId || project) return;
    let cancelled = false;
    void (async () => {
      try {
        const restoredProject = await getProject(savedProjectId);
        const restoredFiles = restoredProject.activeVersionId
          ? await getVersionFiles(restoredProject.id, restoredProject.activeVersionId)
          : [];
        if (cancelled) return;
        const primaryFile = restoredFiles.find((file) => file.kind === "rtl") ?? restoredFiles[0];
        setProject(restoredProject);
        setFiles(restoredFiles);
        setPrompt(restoredProject.prompt);
        setGraphData(restoredProject.version?.architecture ?? {});
        setVerilogCode(primaryFile?.content ?? starterRtl);
        setToast(`Restored ${restoredProject.name}, version ${restoredProject.version?.number ?? ""}.`);
      } catch (error) {
        if (!cancelled) setToast(`Could not restore the last project: ${errorMessage(error)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [project, setFiles, setGraphData, setProject, setPrompt, setVerilogCode]);

  useEffect(() => {
    if (!editedSinceSave.current || !project?.activeVersionId) return;
    const timer = window.setTimeout(() => { void saveActiveRtl(true); }, 750);
    return () => window.clearTimeout(timer);
  }, [project?.activeVersionId, saveActiveRtl, verilogCode]);

  const generate = useCallback(async () => {
    const sourcePrompt = prompt.trim() || "A 4-bit ALU with overflow detection";
    setPrompt(sourcePrompt);
    setIsGenerating(true);
    setGenerationError(null);
    setToast("");
    try {
      const activeProject = project ? await createVersion(project.id, sourcePrompt) : await createProject(sourcePrompt);
      const generated = await generateProject(activeProject.id);
      const primaryFile = generated.files.find((file) => file.kind === "rtl") ?? generated.files[0];
      setProject(generated.project);
      setFiles(generated.files);
      setGraphData(generated.architecture);
      setVerilogCode(primaryFile?.content ?? starterRtl);
      editedSinceSave.current = false;
      window.localStorage.setItem(activeProjectStorageKey, generated.project.id);
      setActiveTab("studio");
      setToast("Architecture and RTL are ready in a new immutable project version.");
    } catch (error) {
      setGenerationError(errorMessage(error));
      setVerilogCode(starterRtl);
      setActiveTab("studio");
      setToast("AI generation is unavailable, so a deterministic local RTL preview was opened instead.");
    } finally {
      setIsGenerating(false);
    }
  }, [project, prompt, setFiles, setGenerationError, setGraphData, setIsGenerating, setProject, setPrompt, setVerilogCode]);

  const persistSchematic = useCallback(async (result: CompileResult, graph: CircuitGraph) => {
    setVerilogCode(result.verilog);
    setActiveTab("studio");
    if (!project?.activeVersionId) {
      setToast("RTL generated locally. Generate a project first to save the schematic and RTL to a version.");
      return;
    }
    try {
      const [rtlFile, schematicFile] = await Promise.all([
        saveDesignFile(project.id, project.activeVersionId, "schematic_top.v", result.verilog),
        saveDesignFile(project.id, project.activeVersionId, "schematic.json", JSON.stringify(graph, null, 2), "script"),
      ]);
      setFiles([...files.filter((file) => ![rtlFile.path, schematicFile.path].includes(file.path)), rtlFile, schematicFile]);
      editedSinceSave.current = false;
      setToast(result.warnings.length ? `RTL and schematic saved with ${result.warnings.length} connection note${result.warnings.length === 1 ? "" : "s"}.` : "Schematic and deterministic RTL saved to the active project version.");
    } catch (error) {
      setToast(`RTL was generated locally, but it could not be saved: ${errorMessage(error)}`);
    }
  }, [files, project, setFiles, setVerilogCode]);

  const runSimulation = useCallback(async () => {
    if (!project?.activeVersionId) {
      setActiveTab("designer");
      setToast("Generate or save a project version before running a simulation.");
      return;
    }
    setIsGenerating(true);
    setToast("");
    try {
      if (editedSinceSave.current && !(await saveActiveRtl(true))) {
        setToast("Simulation was not started because the latest RTL could not be saved.");
        return;
      }
      const simulation = await runProjectSimulation(project.id, project.activeVersionId);
      setSimulationData([simulation]);
      setActiveTab("waveforms");
      setToast(simulation.status === "passed" ? "Simulation passed. Open Waveforms to inspect the trace." : "Simulation completed with failures. Inspect the waveform and logs before repairing.");
    } catch (error) {
      setToast(`Simulation could not run: ${errorMessage(error)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [project, saveActiveRtl, setIsGenerating, setSimulationData]);

  const repairSimulation = useCallback(async () => {
    const latestSimulation = simulationData[0];
    if (!project || latestSimulation?.status !== "failed") return;
    setIsGenerating(true);
    setToast("");
    try {
      const repaired = await autoFixSimulation(project.id, latestSimulation.id);
      const primaryFile = repaired.files.find((file) => file.kind === "rtl") ?? repaired.files[0];
      setProject(repaired.project);
      setFiles(repaired.files);
      setGraphData(repaired.project.version?.architecture ?? {});
      setVerilogCode(primaryFile?.content ?? starterRtl);
      setSimulationData([repaired.rerun]);
      editedSinceSave.current = false;
      window.localStorage.setItem(activeProjectStorageKey, repaired.project.id);
      setActiveTab("waveforms");
      setToast(repaired.rerun.status === "passed" ? `Auto-Fix created version ${repaired.project.version?.number ?? ""} and its verification passed.` : `Auto-Fix created version ${repaired.project.version?.number ?? ""}, but its rerun still needs review.`);
    } catch (error) {
      setToast(`Auto-Fix could not complete: ${errorMessage(error)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [project, setFiles, setGraphData, setIsGenerating, setProject, setSimulationData, setVerilogCode, simulationData]);

  const restoreVersion = useCallback(async (versionId: string) => {
    if (!project) return;
    setIsGenerating(true);
    setToast("");
    try {
      const restored = await restoreProjectVersion(project.id, versionId);
      const restoredFiles = restored.activeVersionId ? await getVersionFiles(restored.id, restored.activeVersionId) : [];
      const primaryFile = restoredFiles.find((file) => file.kind === "rtl") ?? restoredFiles[0];
      setProject(restored);
      setFiles(restoredFiles);
      setPrompt(restored.prompt);
      setGraphData(restored.version?.architecture ?? {});
      setVerilogCode(primaryFile?.content ?? starterRtl);
      editedSinceSave.current = false;
      window.localStorage.setItem(activeProjectStorageKey, restored.id);
      setActiveTab("studio");
      setToast(`Restored the selected version into new version ${restored.version?.number ?? ""}.`);
    } catch (error) {
      setToast(`Version restore could not complete: ${errorMessage(error)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [project, setFiles, setGraphData, setIsGenerating, setProject, setPrompt, setVerilogCode]);

  const exportFpga = useCallback(async (board: string) => {
    if (!project?.activeVersionId) return;
    setIsGenerating(true);
    setToast("");
    try {
      const nextExport = await createFpgaExport(project.id, project.activeVersionId, board);
      setExportResult(nextExport);
      setToast(`FPGA export is ready for ${board}.`);
    } catch (error) {
      setToast(`FPGA export could not complete: ${errorMessage(error)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [project, setIsGenerating]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") generate();
      if (event.key.toLowerCase() === "r" && !event.metaKey && !event.ctrlKey) runSimulation();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [generate, runSimulation]);

  return <main className="workspace-shell">
    <header className="workspace-topbar">
      <a href="/" className="workspace-brand"><span>SC</span> Silicon Canvas</a>
      <nav aria-label="Workspace views">{(["studio", "designer", "architecture", "gates", "waveforms", "project", "copilot"] as Tab[]).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? "active" : ""} aria-current={activeTab === tab ? "page" : undefined}>{tab === "designer" ? "Circuit Designer" : tab === "gates" ? "3D RTL Gates" : tab}</button>)}</nav>
      <div><span className={isGenerating ? "run-chip running" : "run-chip"} aria-live="polite"><i />{isGenerating ? "Agents working" : isSaving ? "Saving RTL" : project ? `Version ${project.version?.number ?? ""} ready` : "Workspace ready"}</span><button className="button-secondary compact" onClick={() => void saveActiveRtl()} disabled={isGenerating || isSaving || !project?.activeVersionId}>Save</button><button className="button-secondary compact" onClick={runSimulation} disabled={isGenerating || isSaving || !project?.activeVersionId}>▶ Simulate</button><button className="button-primary compact" onClick={generate} disabled={isGenerating}>✦ Generate</button></div>
    </header>
    <section className="workspace-prompt"><label htmlFor="hardware-prompt">Describe your hardware</label><textarea id="hardware-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Try: a 4-bit ALU with overflow detection" /><button onClick={generate} disabled={isGenerating}>{isGenerating ? "Generating…" : "Generate design"}</button></section>
    <AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="workspace-content">
      {toast && <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="toast" role="status"><span aria-hidden="true">✓</span><span>{toast}</span><button type="button" aria-label="Dismiss notification" onClick={() => setToast("")}>×</button></motion.div>}
      {activeTab === "studio" && <section className="studio-grid"><div className="editor-shell"><div className="panel-heading"><div><p className="section-kicker">RTL SOURCE</p><h2>{sourceName}</h2></div><span>Verilog-2001</span></div><Editor height="100%" language="verilog" theme="vs-dark" value={verilogCode} onChange={(value) => { editedSinceSave.current = true; setVerilogCode(value ?? ""); }} options={{ fontSize: 13, minimap: { enabled: false }, padding: { top: 16 }, automaticLayout: true }} /></div><AgentMissionControl prompt={prompt} projectId={project?.id} onProjectCreated={adoptMentorProject} /></section>}
      {activeTab === "designer" && <CircuitDesigner onGenerated={persistSchematic} />}
      {activeTab === "architecture" && <ArchitecturePanel architecture={graphData} />}
      {activeTab === "gates" && <RtlGatesPanel architecture={graphData} />}
      {activeTab === "waveforms" && <WaveformPanel simulation={simulationData[0]} onAutoFix={repairSimulation} isAutoFixing={isGenerating} />}
      {activeTab === "project" && <ProjectPanel project={project} versions={versions} usage={usage} exportResult={exportResult} busy={isGenerating} onRestore={restoreVersion} onExport={exportFpga} />}
      {activeTab === "copilot" && <AgentMissionControl prompt={prompt} projectId={project?.id} onProjectCreated={adoptMentorProject} />}
    </motion.div></AnimatePresence>
  </main>;
}
