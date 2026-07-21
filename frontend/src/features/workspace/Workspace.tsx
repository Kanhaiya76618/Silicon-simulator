import Editor from "@monaco-editor/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createProject, createVersion, generateProject, runProjectSimulation, saveDesignFile } from "../../api/client";
import { useHardwareStore } from "../../store/hardwareStore";
import { AgentMissionControl } from "../agents/AgentMissionControl";
import { CircuitDesigner } from "../designer/CircuitDesigner";
import type { CircuitGraph, CompileResult } from "../designer/netlistCompiler";
import { WaveformPanel } from "../waveform/WaveformPanel";

type Tab = "studio" | "designer" | "waveforms" | "copilot";

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
  const setGraphData = useHardwareStore((state) => state.setGraphData);
  const setGenerationError = useHardwareStore((state) => state.setGenerationError);
  const setSimulationData = useHardwareStore((state) => state.setSimulationData);
  const [activeTab, setActiveTab] = useState<Tab>("studio");
  const [toast, setToast] = useState("");

  const sourceName = useMemo(() => files.find((file) => file.kind === "rtl")?.path ?? "schematic_top.v", [files]);

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
      const simulation = await runProjectSimulation(project.id, project.activeVersionId);
      setSimulationData([simulation]);
      setActiveTab("waveforms");
      setToast(simulation.status === "passed" ? "Simulation passed. Open Waveforms to inspect the trace." : "Simulation completed with failures. Inspect the waveform and logs before repairing.");
    } catch (error) {
      setToast(`Simulation could not run: ${errorMessage(error)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [project, setIsGenerating, setSimulationData]);

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
      <nav aria-label="Workspace views">{(["studio", "designer", "waveforms", "copilot"] as Tab[]).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? "active" : ""} aria-current={activeTab === tab ? "page" : undefined}>{tab === "designer" ? "Circuit Designer" : tab}</button>)}</nav>
      <div><span className={isGenerating ? "run-chip running" : "run-chip"} aria-live="polite"><i />{isGenerating ? "Agents working" : project ? `Version ${project.version?.number ?? ""} ready` : "Workspace ready"}</span><button className="button-primary compact" onClick={generate} disabled={isGenerating}>✦ Generate</button></div>
    </header>
    <section className="workspace-prompt"><label htmlFor="hardware-prompt">Describe your hardware</label><textarea id="hardware-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Try: a 4-bit ALU with overflow detection" /><button onClick={generate} disabled={isGenerating}>{isGenerating ? "Generating…" : "Generate design"}</button></section>
    <AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="workspace-content">
      {activeTab === "studio" && <section className="studio-grid"><div className="editor-shell"><div className="panel-heading"><div><p className="section-kicker">RTL SOURCE</p><h2>{sourceName}</h2></div><span>Verilog-2001</span></div><Editor height="100%" language="verilog" theme="vs-dark" value={verilogCode} onChange={(value) => setVerilogCode(value ?? "")} options={{ fontSize: 13, minimap: { enabled: false }, padding: { top: 16 }, automaticLayout: true }} /></div><AgentMissionControl prompt={prompt} /></section>}
      {activeTab === "designer" && <CircuitDesigner onGenerated={persistSchematic} />}
      {activeTab === "waveforms" && <WaveformPanel />}
      {activeTab === "copilot" && <AgentMissionControl prompt={prompt} />}
    </motion.div></AnimatePresence>
    {toast && <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="toast" role="status">✓ {toast}<button type="button" aria-label="Dismiss notification" onClick={() => setToast("")}>×</button></motion.div>}
  </main>;
}
