import Editor from "@monaco-editor/react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { parseVcd, waveformSegments, type VcdSignal, type WaveformSegment } from "@silicon-canvas/vcd-core";
import type { DesignFile, DesignVersion } from "@silicon-canvas/shared/contracts";
import { autoFixSimulation, createFpgaExport, createProject, createVersion, generateProject, getProject, getVersionFiles, listProjectVersions, listProjects, restoreProjectVersion, runProjectSimulation } from "./api/client";
import { CircuitScene } from "./components/CircuitScene";
import LandingPage from "./components/LandingPage";
import { RTLGateScene } from "./components/RTLGateScene";
import { useHardwareStore } from "./store/hardwareStore";

const starterFiles = ['cpu_top.v', 'fetch.v', 'decode.v', 'execute.v', 'memory.v', 'writeback.v', 'hazard_unit.v'];

const flowNodes: Node[] = [
  {
    id: "input",
    position: { x: 24, y: 48 },
    data: { label: "Input signal" },
    style: { background: "#172033", border: "1px solid #334155", borderRadius: "8px", color: "#cbd5e1", fontSize: "12px", padding: "10px 14px" },
  },
  {
    id: "logic",
    position: { x: 112, y: 164 },
    data: { label: "Logic block" },
    style: { background: "#172033", border: "1px solid #334155", borderRadius: "8px", color: "#cbd5e1", fontSize: "12px", padding: "10px 14px" },
  },
];

type ArchitectureModule = { name: string; purpose?: string };
type ArchitectureConnection = { from: string; to: string; signal?: string };
type SimulationSnapshot = { id: string; status: "passed" | "failed"; logs: string; vcdContent: string | null };
type RepairSummary = {
  status: "applied" | "failed";
  diagnosis: string | null;
  changedFiles: string[];
  versionNumber: number | null;
  rerunStatus: "passed" | "failed";
};
type VersionComparison = {
  base: DesignVersion;
  target: DesignVersion;
  path: string;
  baseContent: string;
  targetContent: string;
};

function isSimulationSnapshot(value: unknown): value is SimulationSnapshot {
  return typeof value === "object" && value !== null && typeof (value as SimulationSnapshot).id === "string"
    && ((value as SimulationSnapshot).status === "passed" || (value as SimulationSnapshot).status === "failed")
    && typeof (value as SimulationSnapshot).logs === "string";
}

function flowFromArchitecture(graphData: Record<string, unknown>): { nodes: Node[]; edges: Edge[] } {
  const modules = Array.isArray(graphData.modules)
    ? graphData.modules.filter((item): item is ArchitectureModule => typeof item === "object" && item !== null && typeof (item as ArchitectureModule).name === "string")
    : [];
  if (modules.length === 0) return { nodes: flowNodes, edges: [] };
  const nodes = modules.map((module, index) => ({
    id: module.name,
    position: { x: 24 + index * 190, y: 42 + (index % 2) * 116 },
    data: { label: module.purpose ? `${module.name}: ${module.purpose}` : module.name },
    style: { background: "#172033", border: "1px solid #334155", borderRadius: "8px", color: "#cbd5e1", fontSize: "11px", padding: "9px 11px", maxWidth: "150px" },
  }));
  const knownModules = new Set(modules.map((module) => module.name));
  const connections = Array.isArray(graphData.connections)
    ? graphData.connections.filter((item): item is ArchitectureConnection => typeof item === "object" && item !== null && typeof (item as ArchitectureConnection).from === "string" && typeof (item as ArchitectureConnection).to === "string")
    : [];
  return {
    nodes,
    edges: connections.filter((connection) => knownModules.has(connection.from) && knownModules.has(connection.to)).map((connection, index) => ({
      id: `${connection.from}-${connection.to}-${index}`,
      source: connection.from,
      target: connection.to,
      label: connection.signal,
      style: { stroke: "#38bdf8" },
      labelStyle: { fill: "#94a3b8", fontSize: 9 },
    })),
  };
}

function Workspace() {
  const prompt = useHardwareStore((state) => state.prompt);
  const setPrompt = useHardwareStore((state) => state.setPrompt);
  const verilogCode = useHardwareStore((state) => state.verilogCode);
  const setVerilogCode = useHardwareStore((state) => state.setVerilogCode);
  const isGenerating = useHardwareStore((state) => state.isGenerating);
  const setIsGenerating = useHardwareStore((state) => state.setIsGenerating);
  const project = useHardwareStore((state) => state.project);
  const setProject = useHardwareStore((state) => state.setProject);
  const generatedFiles = useHardwareStore((state) => state.files);
  const setFiles = useHardwareStore((state) => state.setFiles);
  const setGraphData = useHardwareStore((state) => state.setGraphData);
  const graphData = useHardwareStore((state) => state.graphData);
  const simulationData = useHardwareStore((state) => state.simulationData);
  const setSimulationData = useHardwareStore((state) => state.setSimulationData);
  const generationError = useHardwareStore((state) => state.generationError);
  const setGenerationError = useHardwareStore((state) => state.setGenerationError);
  
  const [status, setStatus] = useState<'Ready' | 'Running' | 'Issue detected'>('Ready');
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRequestRef = useRef(false);
  const restoreAttemptedRef = useRef(false);
  const [autoFix, setAutoFix] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [lastRepair, setLastRepair] = useState<RepairSummary | null>(null);
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [selectedFile, setSelectedFile] = useState(starterFiles[0]);
  const [activeTab, setActiveTab] = useState<'workspace' | 'architecture' | 'simulate' | 'gates' | 'export'>('workspace');
  const [activeEditorTab, setActiveEditorTab] = useState("design.v");
  const [activeOutputTab, setActiveOutputTab] = useState("Waveforms");

  const editorTabs = ["design.v", "testbench.v"];
  const outputTabs = ["Waveforms", "Logs"];
  const fileNames = generatedFiles.length > 0 ? generatedFiles.map((file) => file.path) : starterFiles;
  const projectFlow = useMemo(() => flowFromArchitecture(graphData), [graphData]);
  const lastSimulation = simulationData.find(isSimulationSnapshot);
  const viewedVersionId = viewingVersionId ?? project?.activeVersionId ?? null;

  useEffect(() => {
    if (project || restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;
    void (async () => {
      try {
        const recentProjects = await listProjects();
        const restoredProject = recentProjects[0];
        if (!restoredProject?.activeVersionId) return;
        const restoredFiles = await getVersionFiles(restoredProject.id, restoredProject.activeVersionId);
        setProject(restoredProject);
        setViewingVersionId(restoredProject.activeVersionId);
        setPrompt(restoredProject.prompt);
        setFiles(restoredFiles);
        setGraphData(restoredProject.version?.architecture ?? {});
        const primaryFile = restoredFiles.find((file) => file.kind === "rtl") ?? restoredFiles[0];
        if (primaryFile) {
          setSelectedFile(primaryFile.path);
          setVerilogCode(primaryFile.content);
        }
      } catch {
        // The empty workspace remains usable if no local API is available yet.
      }
    })();
  }, [project, setFiles, setGraphData, setProject, setPrompt, setVerilogCode]);

  useEffect(() => {
    if (!project) {
      setVersions([]);
      return;
    }
    void listProjectVersions(project.id).then(setVersions).catch(() => setVersions([]));
  }, [project?.id, project?.activeVersionId]);

  async function runSimulation() {
    if (simulationRequestRef.current) return;
    if (!project?.activeVersionId) {
      setGenerationError("Generate a design before running a simulation.");
      return;
    }
    simulationRequestRef.current = true;
    setIsSimulating(true);
    setStatus('Running');
    setGenerationError(null);
    try {
      const latestProject = await getProject(project.id);
      if (!latestProject.activeVersionId) throw new Error("The project has no active design version to simulate.");
      let versionToRun = viewedVersionId ?? latestProject.activeVersionId;
      if (versionToRun === project.activeVersionId && latestProject.activeVersionId !== project.activeVersionId) {
        const latestFiles = await getVersionFiles(latestProject.id, latestProject.activeVersionId);
        setProject(latestProject);
        setViewingVersionId(latestProject.activeVersionId);
        setFiles(latestFiles);
        const primaryFile = latestFiles.find((file) => file.kind === "rtl") ?? latestFiles[0];
        if (primaryFile) {
          setSelectedFile(primaryFile.path);
          setVerilogCode(primaryFile.content);
        }
        versionToRun = latestProject.activeVersionId;
      }
      const simulation = await runProjectSimulation(latestProject.id, versionToRun);
      setSimulationData([simulation]);
      setStatus(simulation.status === "passed" ? "Ready" : "Issue detected");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Simulation failed.");
      setStatus('Issue detected');
    } finally {
      simulationRequestRef.current = false;
      setIsSimulating(false);
    }
  }

  function openAutoFix() {
    if (viewedVersionId && viewedVersionId !== project?.activeVersionId) {
      setGenerationError("Restore this historical version before using Auto-Fix. Your original version will remain preserved.");
      return;
    }
    if (!lastSimulation || lastSimulation.status !== "failed") {
      setGenerationError("Auto-Fix needs a failed simulation result first.");
      return;
    }
    setGenerationError(null);
    setAutoFix(true);
  }

  async function applyAutoFix() {
    if (!project || !lastSimulation) return;
    setIsAutoFixing(true);
    setGenerationError(null);
    try {
      const result = await autoFixSimulation(project.id, lastSimulation.id);
      setProject(result.project);
      setViewingVersionId(result.project.activeVersionId);
      setFiles(result.files);
      setSimulationData([result.rerun]);
      setLastRepair({
        status: result.autoFix.status === "applied" ? "applied" : "failed",
        diagnosis: result.autoFix.diagnosis,
        changedFiles: result.autoFix.patch.map((file) => file.path),
        versionNumber: result.project.version?.number ?? null,
        rerunStatus: result.rerun.status === "passed" ? "passed" : "failed",
      });
      const primaryFile = result.files.find((file) => file.kind === "rtl") ?? result.files[0];
      if (primaryFile) {
        setSelectedFile(primaryFile.path);
        setVerilogCode(primaryFile.content);
      }
      setStatus(result.rerun.status === "passed" ? "Ready" : "Issue detected");
      if (result.rerun.status !== "passed") {
        setGenerationError("Auto-Fix created a new version, but verification still failed. Review its diagnosis and latest simulator logs before retrying.");
      }
      setAutoFix(false);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Auto-Fix failed.");
    } finally {
      setIsAutoFixing(false);
    }
  }

  function openFile(fileName: string) {
    setSelectedFile(fileName);
    const file = generatedFiles.find((item) => item.path === fileName);
    if (file) setVerilogCode(file.content);
  }

  async function viewVersion(version: DesignVersion) {
    if (!project || version.id === viewedVersionId) return;
    setIsLoadingVersion(true);
    setGenerationError(null);
    try {
      const files = await getVersionFiles(project.id, version.id);
      setViewingVersionId(version.id);
      setFiles(files);
      setGraphData(version.architecture);
      setSimulationData([]);
      const primaryFile = files.find((file) => file.path === selectedFile) ?? files.find((file) => file.kind === "rtl") ?? files[0];
      if (primaryFile) {
        setSelectedFile(primaryFile.path);
        setVerilogCode(primaryFile.content);
      }
      setStatus("Ready");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Unable to load this version.");
    } finally {
      setIsLoadingVersion(false);
    }
  }

  async function restoreVersion(version: DesignVersion) {
    if (!project) return;
    setIsRestoringVersion(true);
    setGenerationError(null);
    try {
      const restoredProject = await restoreProjectVersion(project.id, version.id);
      const files = restoredProject.activeVersionId ? await getVersionFiles(restoredProject.id, restoredProject.activeVersionId) : [];
      setProject(restoredProject);
      setViewingVersionId(restoredProject.activeVersionId);
      setPrompt(restoredProject.prompt);
      setFiles(files);
      setGraphData(restoredProject.version?.architecture ?? {});
      setSimulationData([]);
      const primaryFile = files.find((file) => file.kind === "rtl") ?? files[0];
      if (primaryFile) {
        setSelectedFile(primaryFile.path);
        setVerilogCode(primaryFile.content);
      }
      setStatus("Ready");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Unable to restore this version.");
    } finally {
      setIsRestoringVersion(false);
    }
  }

  async function compareVersion(target: DesignVersion) {
    if (!project || !viewedVersionId) return;
    const base = versions.find((version) => version.id === viewedVersionId);
    if (!base || target.id === base.id) return;
    try {
      const targetFiles = await getVersionFiles(project.id, target.id);
      const baseFile = generatedFiles.find((file) => file.path === selectedFile) ?? generatedFiles.find((file) => file.kind === "rtl") ?? generatedFiles[0];
      const targetFile = targetFiles.find((file) => file.path === baseFile?.path) ?? targetFiles.find((file) => file.kind === "rtl") ?? targetFiles[0];
      if (!baseFile || !targetFile) throw new Error("No comparable source files were found.");
      setComparison({ base, target, path: targetFile.path, baseContent: baseFile.content, targetContent: targetFile.content });
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Unable to compare these versions.");
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setGenerationError("Describe the hardware you want to build first.");
      return;
    }
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const activeProject = project
        ? await createVersion(project.id, prompt)
        : await createProject(prompt);
      setProject(activeProject);
      setViewingVersionId(activeProject.activeVersionId);
      const generated = await generateProject(activeProject.id);
      setProject(generated.project);
      setViewingVersionId(generated.project.activeVersionId);
      setFiles(generated.files);
      setGraphData(generated.architecture);
      const primaryFile = generated.files.find((file) => file.kind === "rtl") ?? generated.files[0];
      if (primaryFile) {
        setSelectedFile(primaryFile.path);
        setVerilogCode(primaryFile.content);
      }
      setStatus("Ready");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Design generation failed.");
      setStatus("Issue detected");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="app-shell flex h-screen w-screen flex-col overflow-hidden bg-[#0b1220] text-slate-200">
      <header className="top-nav glass flex h-14 shrink-0 items-center justify-between border-b border-slate-700/60 bg-[#0f172a] px-4">
        <div className="brand flex items-center gap-2 font-semibold">
          <span className="brand-mark grid h-6 w-6 place-items-center bg-blue-600 text-xs text-white">S</span>
          <span>Silicon Canvas</span>
          <small className="rounded bg-blue-900/50 px-1.5 py-0.5 font-mono text-[10px] text-blue-300">BETA</small>
        </div>
        <nav className="product-tabs flex gap-2" aria-label="Workspace view tabs">
          <Tab label="Design workspace" active={activeTab === 'workspace'} onClick={() => setActiveTab('workspace')} />
          <Tab label="Architecture" active={activeTab === 'architecture'} onClick={() => setActiveTab('architecture')} />
          <Tab label="Simulation" active={activeTab === 'simulate'} onClick={() => setActiveTab('simulate')} />
          <Tab label="3D RTL gates" active={activeTab === 'gates'} onClick={() => setActiveTab('gates')} />
          <Tab label="FPGA export" active={activeTab === 'export'} onClick={() => setActiveTab('export')} />
        </nav>
        <div className="nav-actions flex items-center gap-3">
          <span className={`status text-xs ${status === 'Running' ? 'text-amber-400' : status === 'Issue detected' ? 'text-rose-400' : 'text-emerald-400'}`}>
            ● {status}
          </span>
          <button type="button" onClick={runSimulation} disabled={isSimulating} className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50">
            {isSimulating ? "Running…" : "▶ Run Simulation"}
          </button>
          <button type="button" onClick={openAutoFix} className="rounded border border-blue-500/40 bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-300 hover:bg-blue-900/50">
            ✦ Auto-Fix
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden">
        {activeTab === 'workspace' && (
          <div className="flex h-full w-full flex-row">
            <aside className="flex w-80 shrink-0 flex-col border-r border-slate-700/60 bg-[#0f172a] p-4">
              <div className="mb-4 shrink-0">
                <label htmlFor="design-prompt" className="mb-2 block text-xs font-medium tracking-wider text-slate-400">
                  ARCHITECTURE &amp; PROMPT
                </label>
                <textarea
                  id="design-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="e.g. Create an 8-bit synchronous counter with reset"
                  className="h-32 w-full resize-none rounded-md border border-slate-700 bg-[#111827] p-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500/70"
                />
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerate}
                    className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                  >
                    {isGenerating ? "Generating…" : "Generate"}
                  </button>
                  {generationError && <p role="alert" className="mt-2 text-xs text-rose-400">{generationError}</p>}
              </div>

              <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-400">
                <span>PROJECT FILES</span>
              </div>
              <div className="flex-1 overflow-y-auto rounded-md border border-slate-700/60 bg-[#111827] p-1">
                {fileNames.map((file) => (
                  <button
                    key={file}
                    type="button"
                    onClick={() => openFile(file)}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs ${selectedFile === file ? 'bg-blue-600/30 text-blue-200 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    <span>◈ {file}</span>
                    <small className="text-[10px] text-slate-500">{generatedFiles.find((item) => item.path === file)?.content.length ?? (file === 'cpu_top.v' ? 4300 : 2100)} B</small>
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col border-r border-slate-700/60 bg-[#111827]">
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-700/60 bg-[#0f172a] px-4">
                <div className="flex h-full items-center gap-1">
                  {editorTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveEditorTab(tab)}
                      className={`flex h-full items-center border-b-2 px-2 text-xs transition ${
                        activeEditorTab === tab ? "border-blue-500 text-white font-medium" : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <span className="ml-3 shrink-0 text-[10px] font-mono text-slate-500">Editing {selectedFile}</span>
              </div>
              <div className="min-h-0 flex-1">
                <Editor
                  height="100%"
                  language="verilog"
                  theme="silicon-canvas"
                  value={verilogCode}
                  onChange={(value) => setVerilogCode(value ?? "")}
                  beforeMount={(monaco) => {
                    monaco.editor.defineTheme("silicon-canvas", {
                      base: "vs-dark",
                      inherit: true,
                      rules: [],
                      colors: {
                        "editor.background": "#111827",
                        "editor.foreground": "#dbeafe",
                        "editorGutter.background": "#111827",
                        "editorLineNumber.foreground": "#64748b",
                        "editorLineNumber.activeForeground": "#cbd5e1",
                        "editorCursor.foreground": "#93c5fd",
                        "editor.selectionBackground": "#1e3a5f",
                        "editor.inactiveSelectionBackground": "#1e293b",
                        "editor.lineHighlightBackground": "#172033",
                      },
                    });
                  }}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    padding: { top: 12 },
                  }}
                />
              </div>
            </section>

            <aside className="flex w-[460px] shrink-0 flex-col bg-[#0f172a]">
              <div className="flex h-10 shrink-0 items-center gap-4 border-b border-slate-700/60 px-4">
                {outputTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveOutputTab(tab)}
                    className={`flex h-10 items-center border-b-2 text-xs transition ${
                      activeOutputTab === tab ? "border-blue-500 text-white font-medium" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 p-3">
                {activeOutputTab === "Waveforms" ? <Waveform /> : (
                  <div className="h-full rounded-md border border-slate-700/60 bg-[#111827] p-3 font-mono text-xs text-slate-400">
                    {simulationData.find((item): item is { logs: string } => typeof item === "object" && item !== null && typeof (item as { logs?: unknown }).logs === "string")?.logs || "Simulation logs will appear here."}
                  </div>
                )}
              </div>
              <div className="h-64 border-t border-slate-700/60 p-2">
                <div className="h-full w-full overflow-hidden rounded-md border border-slate-700/60 bg-[#0b1220]">
                  <ReactFlow nodes={projectFlow.nodes} edges={projectFlow.edges} fitView colorMode="dark" style={{ backgroundColor: "#0b1220" }}>
                    <Background gap={16} size={1} color="#334155" />
                    <Controls />
                  </ReactFlow>
                </div>
              </div>

            </aside>
          </div>
        )}

        {activeTab === 'architecture' && <Architecture onOpen3D={() => setActiveTab('gates')} />}
        {activeTab === 'simulate' && <Simulation onAutoFix={openAutoFix} onRun={runSimulation} status={status} isSimulating={isSimulating} simulation={lastSimulation} error={generationError} repair={lastRepair} />}
        {activeTab === 'gates' && <div className="h-full w-full bg-[#0b1220] p-4"><RTLGateScene /></div>}
        {activeTab === 'export' && <ExportPanel />}
      </main>

      {comparison && <VersionCompare comparison={comparison} onClose={() => setComparison(null)} />}
      {autoFix && <AutoFix onClose={() => setAutoFix(false)} onApply={applyAutoFix} isApplying={isAutoFixing} />}
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`tab px-3 py-1.5 text-xs font-medium transition ${active ? 'active-tab bg-slate-800 text-blue-300 rounded' : 'text-slate-400 hover:text-slate-200'}`}
      onClick={onClick}
      aria-selected={active}
    >
      {label}
    </button>
  );
}

function Architecture({ onOpen3D }: { onOpen3D: () => void }) {
  const blocks = [['Fetch', 'Program counter · instruction memory'], ['Decode', 'Register file · control decode'], ['Execute', 'ALU · branch unit · forwarding'], ['Memory', 'Load/store interface'], ['Writeback', 'Result mux · register commit']];
  return (
    <section className="feature-view architecture-view p-6 text-slate-200 w-full overflow-y-auto">
      <div className="feature-top flex justify-between items-center mb-6">
        <div>
          <p className="eyebrow text-xs text-blue-400 font-mono">INTERACTIVE VISUAL RTL ARCHITECTURE</p>
          <h2 className="text-2xl font-bold text-white mt-1">Trace every block across RTL and waveform.</h2>
          <p className="text-slate-400 text-sm mt-1">Select a block to reveal its source module, signal group, and current cycle state.</p>
        </div>
        <button type="button" className="autofix bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium" onClick={onOpen3D}>
          Open 3D RTL gates →
        </button>
      </div>
      <div className="architecture-canvas glass bg-slate-900/80 border border-slate-700/60 p-6 rounded-lg">
        <div className="arch-flow flex items-center justify-between gap-4 mb-6 overflow-x-auto pb-4">
          {blocks.map(([name, detail], index) => (
            <div className="arch-item flex items-center gap-3" key={name}>
              <button type="button" className="bg-slate-800 border border-slate-700 p-4 rounded text-left hover:border-blue-500 transition w-48">
                <strong className="block text-white text-base">{name}</strong>
                <span className="block text-xs text-slate-400 mt-1">{detail}</span>
                <small className="block text-[10px] text-blue-400 font-mono mt-2">{['fetch.v', 'decode.v', 'execute.v', 'memory.v', 'writeback.v'][index]}</small>
              </button>
              {index < blocks.length - 1 && <i className="text-slate-500 font-bold">→</i>}
            </div>
          ))}
        </div>
        <div className="architecture-inspector border-t border-slate-700/60 pt-4 flex flex-wrap gap-6 text-xs text-slate-300">
          <b>Selected: Execute</b>
          <span>Related RTL lines: 24–48</span>
          <span>Waveform group: ALU, branch, forward_a, forward_b</span>
          <span className="teal-text text-teal-400">Cycle 142: branch target active</span>
        </div>
      </div>
    </section>
  );
}

function Simulation({ onAutoFix, onRun, status, isSimulating, simulation, error, repair }: {
  onAutoFix: () => void;
  onRun: () => void;
  status: string;
  isSimulating: boolean;
  simulation: SimulationSnapshot | undefined;
  error: string | null;
  repair: RepairSummary | null;
}) {
  const hasRun = Boolean(simulation);
  const passed = simulation?.status === "passed";
  const failed = simulation?.status === "failed";
  const logExcerpt = simulation?.logs.trim().split("\n").slice(0, 8).join("\n");
  return (
    <section className="feature-view simulation-view p-6 text-slate-200 w-full overflow-y-auto">
      <div className="feature-top flex justify-between items-center mb-6">
        <div>
          <p className="eyebrow text-xs text-blue-400 font-mono">ISOLATED HDL SIMULATION</p>
          <h2 className="text-2xl font-bold text-white mt-1">Testbench proof, not just generated code.</h2>
          <p className="text-slate-400 text-sm mt-1">Icarus Verilog runs the generated testbench in an isolated worker and returns logs plus a VCD trace.</p>
        </div>
        <button type="button" disabled={isSimulating} className="run bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-60" onClick={onRun}>
          {isSimulating ? "Running testbench…" : "▶ Run testbench"}
        </button>
      </div>
      <div className={`failure-evidence glass border p-5 rounded flex items-center justify-between ${isSimulating ? "border-amber-800/50 bg-amber-950/20" : passed ? "border-emerald-800/50 bg-emerald-950/20" : failed ? "border-rose-900/60 bg-rose-950/20" : "border-slate-700 bg-slate-900/90"}`}>
        <div>
          <p className={`eyebrow text-xs font-mono ${isSimulating ? "text-amber-400" : passed ? "text-emerald-400" : failed ? "text-rose-400" : "text-blue-400"}`}>
            {isSimulating ? "SIMULATION IN PROGRESS" : passed ? "VERIFICATION PASSED" : failed ? "SIMULATION FAILED" : "NO SIMULATION RUN YET"}
          </p>
          <h3 className="text-lg font-bold text-white mt-1">
            {isSimulating ? "Compiling and running the active testbench…" : passed ? "The active testbench completed successfully." : failed ? "The testbench needs a repair before it can run." : "Run the generated testbench to validate this version."}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isSimulating ? "The Run button is temporarily locked so duplicate requests cannot overwrite this result." : passed ? "Open the workspace Waveforms tab to inspect the captured VCD signals." : failed ? "The compiler/runtime evidence is shown below. Auto-Fix will create a repaired version and rerun it." : "Logs and waveforms will appear after the first completed run."}
          </p>
        </div>
        <button type="button" disabled={!failed || isSimulating} className="autofix bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50" onClick={onAutoFix}>
          ✦ Auto-Fix with Codex
        </button>
      </div>
      {hasRun && (
        <div className="mt-5 rounded border border-slate-700/60 bg-[#111827] p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <b className="text-slate-200">Latest simulator output</b>
            <span className={passed ? "text-emerald-400" : "text-rose-400"}>{simulation?.status.toUpperCase()}</span>
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-400">{logExcerpt || "The simulator did not return any text output."}</pre>
        </div>
      )}
      {repair && (
        <article className={`mt-5 rounded border p-4 ${repair.rerunStatus === "passed" ? "border-emerald-800/60 bg-emerald-950/20" : "border-rose-900/60 bg-rose-950/20"}`}>
          <div className="flex items-center justify-between gap-4 text-xs">
            <b className={repair.rerunStatus === "passed" ? "text-emerald-300" : "text-rose-300"}>
              Auto-Fix {repair.rerunStatus === "passed" ? "verified" : "needs another repair"}{repair.versionNumber ? ` · version ${repair.versionNumber}` : ""}
            </b>
            <span className="font-mono text-slate-400">{repair.changedFiles.length} file{repair.changedFiles.length === 1 ? "" : "s"} changed</span>
          </div>
          {repair.diagnosis && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-300">{repair.diagnosis}</p>}
          {repair.changedFiles.length > 0 && <p className="mt-2 font-mono text-[11px] text-slate-400">Changed: {repair.changedFiles.join(", ")}</p>}
        </article>
      )}
      {error && <p role="alert" className="mt-4 text-xs text-rose-400">{error}</p>}
      <p className="sim-status mt-4 text-xs text-slate-400">Simulation status: <b className="text-white">{status}</b></p>
    </section>
  );
}

function ExportPanel() {
  const project = useHardwareStore((state) => state.project);
  const [board, setBoard] = useState("icestick");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function exportPackage() {
    if (!project?.activeVersionId) {
      setExportMessage("Generate a design before creating an FPGA package.");
      return;
    }
    setIsExporting(true);
    setExportMessage(null);
    try {
      const exported = await createFpgaExport(project.id, project.activeVersionId, board);
      for (const artifact of exported.artifacts) {
        const href = URL.createObjectURL(new Blob([artifact.content], { type: "text/plain" }));
        const link = document.createElement("a");
        link.href = href;
        link.download = artifact.path;
        link.click();
        URL.revokeObjectURL(href);
      }
      setExportMessage(`Generated ${exported.artifacts.length} files for ${board}. Review pin constraints before programming hardware.`);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "FPGA export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="feature-view export-view p-6 text-slate-200 w-full overflow-y-auto">
      <div className="feature-top mb-6">
        <div>
          <p className="eyebrow text-xs text-blue-400 font-mono">FPGA-READY ONE-CLICK EXPORT</p>
          <h2 className="text-2xl font-bold text-white mt-1">Take verified RTL onto real hardware.</h2>
          <p className="text-slate-400 text-sm mt-1">Package generated Verilog, pin constraints, and a reproducible Yosys/NextPNR build script.</p>
        </div>
      </div>
      <div className="export-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          ['1', 'Choose board', 'IceStick FPGA'],
          ['2', 'Generate constraints', 'silicon_canvas.pcf'],
          ['3', 'Build package', 'Yosys + NextPNR'],
        ].map(([number, title, detail]) => (
          <article className="glass export-step bg-slate-900/80 border border-slate-700 p-4 rounded flex items-start gap-4" key={number}>
            <span className="grid h-7 w-7 place-items-center rounded bg-blue-600 text-xs font-bold text-white">{number}</span>
            <div>
              <b className="block text-white text-sm">{title}</b>
              <p className="text-xs text-slate-400 mt-1">{detail}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="export-actions glass bg-slate-900/80 border border-slate-700 p-4 rounded flex items-center gap-4">
        <select value={board} onChange={(event) => setBoard(event.target.value)} aria-label="Target FPGA board" className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-3 py-2 outline-none">
          <option value="icestick">IceStick FPGA</option>
          <option value="arty_a7">Arty A7</option>
          <option value="icebreaker">iCEBreaker</option>
        </select>
        <button type="button" disabled={isExporting} onClick={exportPackage} className="run bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-xs font-medium disabled:opacity-60">
          {isExporting ? "Creating package…" : "Export hardware package"}
        </button>
      </div>
      {exportMessage && <p role="status" className="mt-3 text-xs text-slate-400">{exportMessage}</p>}
    </section>
  );
}

const fallbackWaveformSignals: VcdSignal[] = [
  { id: "clk", name: "clk", width: 1 },
  { id: "pc", name: "pc[31:0]", width: 32 },
  { id: "instruction", name: "instruction[31:0]", width: 32 },
  { id: "alu_result", name: "alu_result[31:0]", width: 32 },
  { id: "mem_read", name: "mem_read", width: 1 },
  { id: "branch_taken", name: "branch_taken", width: 1 },
  { id: "hazard_stall", name: "hazard_stall", width: 1 },
];

function shortSignalName(name: string) {
  return name.split(".").slice(-2).join(".");
}

function signalPriority(signal: VcdSignal) {
  const name = signal.name.toLowerCase();
  let score = signal.width <= 32 ? 10 : -40;
  score -= signal.name.split(".").length * 2;
  if (/\$|silicon_canvas_dump|ivl_|vpi/.test(name)) score -= 1_000;
  if (/(^|[._])(?:clk|clock)(?:$|[._])/.test(name)) score += 120;
  if (/(rst|reset)/.test(name)) score += 110;
  if (/(overflow|carry|borrow|zero|flag|error|valid|ready)/.test(name)) score += 90;
  if (/(sum|result|output|out|data_out|q\b)/.test(name)) score += 72;
  if (/(^|[._])(?:a|b|x|y|operand|input|data_in)(?:$|[._\[])/.test(name)) score += 58;
  if (/(sub|add|select|sel|enable|en\b|opcode)/.test(name)) score += 48;
  return score;
}

function selectWaveformSignals(signals: VcdSignal[]) {
  const selectedNames = new Set<string>();
  return [...signals]
    .sort((left, right) => signalPriority(right) - signalPriority(left))
    .filter((signal) => {
      const leafName = signal.name.split(".").at(-1)?.replace(/\[[^\]]+\]$/, "") ?? signal.name;
      if (selectedNames.has(leafName)) return false;
      selectedNames.add(leafName);
      return true;
    })
    .slice(0, 8);
}

function compactSegments(segments: WaveformSegment[], limit = 160) {
  if (segments.length <= limit) return segments;
  const step = Math.ceil(segments.length / limit);
  return segments.filter((_, index) => index === 0 || index === segments.length - 1 || index % step === 0);
}

function Waveform() {
  const simulationData = useHardwareStore((state) => state.simulationData);
  const vcdContent = simulationData.find((item): item is { vcdContent: string } => typeof item === "object" && item !== null && typeof (item as { vcdContent?: unknown }).vcdContent === "string")?.vcdContent;
  const parsed = useMemo(() => vcdContent ? parseVcd(vcdContent) : null, [vcdContent]);
  const signals = useMemo(() => parsed?.signals.length ? selectWaveformSignals(parsed.signals) : fallbackWaveformSignals, [parsed]);
  const tracePath = (signalId: string, index: number) => {
    const changes = parsed?.changesBySignalId[signalId];
    if (!parsed || !changes?.length) return index === 0
      ? 'M0 21H25V5H50V21H75V5H100V21H125V5H150V21H175V5H200V21H225V5H250V21H275V5H300V21H325V5H350V21H375V5H400V21H425V5H450V21H475V5H500V21H525V5H550V21H575V5H600V21H625V5H650V21H700'
      : index === 6 ? 'M0 21H185V5H235V21H700' : 'M0 21H100V5H275V21H440V5H700';
    const maxTime = Math.max(parsed.endTime, 1);
    return compactSegments(waveformSegments(changes, parsed.endTime)).map((segment, segmentIndex) => {
      const start = (segment.from / maxTime) * 700;
      const end = (segment.to / maxTime) * 700;
      const y = segment.value === '1' ? 5 : segment.value === '0' ? 21 : 13;
      return `${segmentIndex === 0 ? `M${start},${y}` : `V${y}H${start}`}H${end}`;
    }).join('');
  };
  return (
    <section className="waveform glass h-full rounded-md border border-slate-700/60 p-3 flex flex-col" style={{ height: "100%", marginTop: 0, background: "#0f172a", color: "#cbd5e1" }}>
      <div className="wave-head flex justify-between items-center pb-2 border-b border-slate-800 text-xs" style={{ borderColor: "#24324a", color: "#94a3b8" }}>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Go to first cycle" className="hover:text-white">↤</button>
          <button type="button" aria-label="Previous cycle" className="hover:text-white">◀</button>
          <button type="button" className="play bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] hover:bg-blue-500">▶</button>
          <button type="button" aria-label="Next cycle" className="hover:text-white">▶</button>
          <button type="button" aria-label="Go to final cycle" className="hover:text-white">↦</button>
          <span className="ml-2 font-mono">{parsed ? `${signals.length} key signals · ${parsed.endTime}${parsed.timescale ? ` ${parsed.timescale}` : " ticks"}` : "Example waveform"}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Zoom out" className="hover:text-white">−</button>
          <button type="button" aria-label="Zoom in" className="hover:text-white">＋</button>
        </div>
      </div>
      <div className="wave-body flex-1 flex overflow-hidden pt-2 font-mono text-xs">
        <div className="signal-list w-44 shrink-0 flex flex-col justify-around pr-2 border-r" style={{ width: "11rem", flexBasis: "11rem", background: "#111c30", borderColor: "#24324a" }}>
          {signals.map((signal, i) => (
            <span key={signal.id} title={signal.name} className="truncate flex items-center gap-1.5" style={{ color: "#cbd5e1" }}>
              <i className={`dot h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-blue-400' : i === 6 ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              {shortSignalName(signal.name)}{signal.width > 1 && !signal.name.includes("[") ? `[${signal.width - 1}:0]` : ""}
            </span>
          ))}
        </div>
        <div className="traces flex-1 relative overflow-x-auto pl-2" style={{ backgroundColor: "#0b1220", backgroundImage: "linear-gradient(90deg, #23314a 1px, transparent 1px)", backgroundSize: "12.5% 100%" }}>
          <div className="ruler text-[10px] mb-1 border-b pb-1" style={{ color: "#64748b", borderColor: "#24324a" }}>
            0　　{Math.round((parsed?.endTime ?? 240) / 6)}　　{Math.round((parsed?.endTime ?? 240) / 3)}　　{Math.round((parsed?.endTime ?? 240) / 2)}　　{Math.round((parsed?.endTime ?? 240) * 2 / 3)}　　{Math.round((parsed?.endTime ?? 240) * 5 / 6)}　　{parsed?.endTime ?? 240}
          </div>
          {signals.map((signal, i) => (
            <div className="trace h-6 my-1" key={signal.id} style={{ height: "1.5rem" }}>
              <svg viewBox="0 0 700 28" preserveAspectRatio="none" className="h-full fill-none" style={{ width: "100%", height: "1.5rem" }}>
                <path d={tracePath(signal.id, i)} stroke={i === 0 ? "#60a5fa" : i === 6 ? "#fb7185" : "#34d399"} strokeWidth="1.7" fill="none" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function diffWindow(baseContent: string, targetContent: string) {
  const baseLines = baseContent.split("\n");
  const targetLines = targetContent.split("\n");
  let firstChanged = 0;
  while (firstChanged < baseLines.length && firstChanged < targetLines.length && baseLines[firstChanged] === targetLines[firstChanged]) {
    firstChanged += 1;
  }
  if (firstChanged === baseLines.length && firstChanged === targetLines.length) {
    return { identical: true, firstLine: 1, baseLines: [], targetLines: [], hiddenBefore: 0, hiddenAfter: 0 };
  }
  let sharedSuffix = 0;
  while (
    sharedSuffix < baseLines.length - firstChanged
    && sharedSuffix < targetLines.length - firstChanged
    && baseLines[baseLines.length - 1 - sharedSuffix] === targetLines[targetLines.length - 1 - sharedSuffix]
  ) {
    sharedSuffix += 1;
  }
  const start = Math.max(0, firstChanged - 4);
  const baseEnd = Math.min(baseLines.length, baseLines.length - sharedSuffix + 4);
  const targetEnd = Math.min(targetLines.length, targetLines.length - sharedSuffix + 4);
  return {
    identical: false,
    firstLine: start + 1,
    baseLines: baseLines.slice(start, baseEnd),
    targetLines: targetLines.slice(start, targetEnd),
    hiddenBefore: start,
    hiddenAfter: Math.max(baseLines.length - baseEnd, targetLines.length - targetEnd),
  };
}

function VersionCompare({ comparison, onClose }: { comparison: VersionComparison; onClose: () => void }) {
  const preview = useMemo(() => diffWindow(comparison.baseContent, comparison.targetContent), [comparison]);
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <aside className="w-full max-w-5xl rounded-lg border border-slate-700 bg-[#0f172a] p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-700/60 pb-4">
          <div>
            <p className="text-xs font-mono text-blue-400">VERSION COMPARE</p>
            <h2 className="mt-1 text-lg font-bold text-white">v{comparison.base.number} → v{comparison.target.number}</h2>
            <p className="mt-1 font-mono text-xs text-slate-400">{comparison.path}</p>
          </div>
          <button type="button" aria-label="Close comparison" className="text-xl text-slate-400 hover:text-white" onClick={onClose}>×</button>
        </div>
        {preview.identical ? (
          <p className="py-10 text-center text-sm text-emerald-300">This file is identical in both versions.</p>
        ) : (
          <div className="py-4">
            <p className="mb-2 text-xs text-slate-400">Showing the first changed section, starting around line {preview.firstLine}.</p>
            <div className="grid max-h-[55vh] grid-cols-1 gap-3 overflow-auto md:grid-cols-2">
              <section className="rounded border border-rose-900/60 bg-rose-950/20 p-3">
                <p className="mb-2 text-xs font-medium text-rose-300">v{comparison.base.number} · removed / previous</p>
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-300">{preview.hiddenBefore > 0 ? "…\n" : ""}{preview.baseLines.map((line) => `- ${line}`).join("\n")}{preview.hiddenAfter > 0 ? "\n…" : ""}</pre>
              </section>
              <section className="rounded border border-emerald-900/60 bg-emerald-950/20 p-3">
                <p className="mb-2 text-xs font-medium text-emerald-300">v{comparison.target.number} · added / current</p>
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-300">{preview.hiddenBefore > 0 ? "…\n" : ""}{preview.targetLines.map((line) => `+ ${line}`).join("\n")}{preview.hiddenAfter > 0 ? "\n…" : ""}</pre>
              </section>
            </div>
          </div>
        )}
        <p className="border-t border-slate-700/60 pt-3 text-[10px] text-slate-500">Compare is read-only. Restore creates a new version, so project history is never overwritten.</p>
      </aside>
    </div>
  );
}

function VersionHistory({ versions, activeVersionId, viewedVersionId, isLoading, isRestoring, onClose, onView, onCompare, onRestore }: {
  versions: DesignVersion[];
  activeVersionId: string | null;
  viewedVersionId: string | null;
  isLoading: boolean;
  isRestoring: boolean;
  onClose: () => void;
  onView: (version: DesignVersion) => void;
  onCompare: (version: DesignVersion) => void;
  onRestore: (version: DesignVersion) => void;
}) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex p-4" style={{ justifyContent: "center", alignItems: "center" }} onMouseDown={onClose}>
      <aside className="w-full max-w-2xl rounded-lg border border-slate-700 bg-[#0f172a] p-5 shadow-xl" style={{ maxHeight: "min(78vh, 42rem)" }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-700/60 pb-4">
          <div>
            <p className="text-xs font-mono text-blue-400">PROJECT HISTORY</p>
            <h2 className="mt-1 text-lg font-bold text-white">Versions are immutable checkpoints</h2>
            <p className="mt-1 text-xs text-slate-400">View or compare any version. Restore always creates a new active version.</p>
          </div>
          <button type="button" aria-label="Close version history" className="text-xl text-slate-400 hover:text-white" onClick={onClose}>×</button>
        </div>
        <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {versions.map((version) => {
            const isActive = version.id === activeVersionId;
            const isViewed = version.id === viewedVersionId;
            return (
              <article key={version.id} className={`rounded border p-3 ${isViewed ? "border-blue-500/60 bg-blue-950/30" : "border-slate-700/70 bg-[#111827]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <b className="text-sm text-white">Version {version.number}</b>
                    {isActive && <span className="ml-2 rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] text-emerald-300">ACTIVE</span>}
                    {!isActive && isViewed && <span className="ml-2 rounded bg-blue-950 px-1.5 py-0.5 text-[10px] text-blue-300">VIEWING</span>}
                    <p className="mt-1 max-w-md truncate text-xs text-slate-400">{version.sourcePrompt}</p>
                  </div>
                  <span className="rounded border border-slate-700 px-2 py-1 font-mono text-[10px] text-slate-400">{version.generationStatus}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={isLoading || isViewed} onClick={() => { onView(version); onClose(); }} className="rounded border border-blue-500/50 px-2.5 py-1 text-xs text-blue-200 hover:bg-blue-950/60 disabled:opacity-50">{isViewed ? "Viewing" : "View"}</button>
                  {!isViewed && <button type="button" onClick={() => { onCompare(version); onClose(); }} className="rounded border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800">Compare</button>}
                  {!isActive && <button type="button" disabled={isRestoring} onClick={() => { onRestore(version); onClose(); }} className="rounded border border-amber-700/60 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-950/40 disabled:opacity-50">{isRestoring ? "Restoring…" : "Restore as new"}</button>}
                </div>
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function AutoFix({ onClose, onApply, isApplying }: { onClose: () => void; onApply: () => void; isApplying: boolean }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <aside className="fix-panel w-full max-w-lg rounded-lg border border-slate-700 bg-[#0f172a] p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fix-header flex items-start justify-between border-b border-slate-700/60 pb-4">
          <div>
            <p className="text-xs font-mono text-blue-400">✦ AUTO-FIX WITH AI</p>
            <h2 className="text-lg font-bold text-white mt-1">Diagnose and repair failed run</h2>
            <span className="text-xs text-rose-400 font-medium">RTL, testbench, logs, and VCD context are sent to the repair workflow.</span>
          </div>
          <button type="button" className="text-slate-400 hover:text-white text-xl" onClick={onClose}>×</button>
        </div>
        <div className="fix-content py-4 space-y-4">
          <div className="issue rounded bg-slate-900 p-3 text-xs border border-slate-800">
            <b className="text-amber-400">△ Verification-preserving repair</b>
            <p className="text-slate-300 mt-1">The AI identifies the underlying RTL or testbench bug, creates a new project version, and reruns it in the isolated simulator. Assertions are not weakened.</p>
          </div>
          <p className="label text-[10px] font-mono tracking-wider text-slate-400">WORKFLOW</p>
          <p className="rounded bg-black/50 p-3 font-mono text-xs text-slate-300 border border-slate-800">failed simulation → Azure diagnosis → new RTL version → isolated rerun → updated VCD</p>
        </div>
        <div className="fix-actions flex items-center justify-between border-t border-slate-700/60 pt-4">
          <button type="button" disabled={isApplying} className="apply rounded bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60" onClick={onApply}>
            {isApplying ? "Repairing and rerunning…" : "✦ Diagnose, apply, and rerun"}
          </button>
          <small className="text-[10px] text-slate-500">AI generated — verify before synthesizing.</small>
        </div>
      </aside>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/workspace" element={<Workspace />} />
    </Routes>
  );
}

export default App;
