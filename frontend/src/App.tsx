import Editor from "@monaco-editor/react";
import { Background, Controls, ReactFlow, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import { useHardwareStore } from "./store/hardwareStore";

const flowNodes: Node[] = [
  {
    id: "input",
    position: { x: 24, y: 48 },
    data: { label: "Input signal" },
    style: {
      background: "#172033",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#cbd5e1",
      fontSize: "12px",
      padding: "10px 14px",
    },
  },
  {
    id: "logic",
    position: { x: 112, y: 164 },
    data: { label: "Logic block" },
    style: {
      background: "#172033",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#cbd5e1",
      fontSize: "12px",
      padding: "10px 14px",
    },
  },
];

function Workspace() {
  const prompt = useHardwareStore((state) => state.prompt);
  const setPrompt = useHardwareStore((state) => state.setPrompt);
  const verilogCode = useHardwareStore((state) => state.verilogCode);
  const setVerilogCode = useHardwareStore((state) => state.setVerilogCode);
  const isGenerating = useHardwareStore((state) => state.isGenerating);
  const [activeEditorTab, setActiveEditorTab] = useState("design.v");
  const [activeOutputTab, setActiveOutputTab] = useState("Waveforms");

  const editorTabs = ["design.v", "testbench.v"];
  const outputTabs = ["Waveforms", "Logs"];

  return (
    <main className="flex h-screen w-screen flex-row overflow-hidden bg-[#0b1220] text-slate-200">
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
            className="h-36 w-full resize-none rounded-md border border-slate-700 bg-[#111827] p-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500/70"
          />
          <button
            type="button"
            disabled={isGenerating}
            className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "Generating…" : "Generate"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-slate-700/60 bg-[#0b1220]">
          <ReactFlow
            defaultNodes={flowNodes}
            fitView
            colorMode="dark"
            style={{ backgroundColor: "#0b1220" }}
          >
            <Background gap={16} size={1} color="#334155" />
            <Controls />
          </ReactFlow>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col border-r border-slate-700/60 bg-[#111827]">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-700/60 bg-[#0f172a] px-2">
          {editorTabs.map((tab) => {
            const isActive = activeEditorTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveEditorTab(tab)}
                aria-selected={isActive}
                className={`flex h-10 items-center border-b-2 px-3 text-sm transition ${
                  isActive
                    ? "border-blue-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            );
          })}
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
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 16 },
            }}
          />
        </div>
      </section>

      <aside className="flex w-[450px] shrink-0 flex-col bg-[#0f172a]">
        <div className="flex h-10 shrink-0 items-center gap-4 border-b border-slate-700/60 px-4">
          {outputTabs.map((tab) => {
            const isActive = activeOutputTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveOutputTab(tab)}
                aria-selected={isActive}
                className={`flex h-10 items-center border-b-2 text-sm transition ${
                  isActive
                    ? "border-blue-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 p-4">
          <div className="h-full w-full overflow-hidden rounded-md border border-slate-700/60 bg-[linear-gradient(to_right,_#1e293b_1px,_transparent_1px),linear-gradient(to_bottom,_#1e293b_1px,_transparent_1px)] bg-[size:20px_20px]">
            {activeOutputTab === "Waveforms" ? (
              <canvas
                aria-label="Waveform canvas"
                className="h-full w-full"
              />
            ) : (
              <div className="h-full overflow-auto p-3 font-mono text-xs leading-6 text-slate-400">
                Simulation logs will appear here.
              </div>
            )}
          </div>
        </div>

        <div className="flex h-12 shrink-0 items-center justify-between border-t border-slate-700/60 px-4">
          <button
            type="button"
            className="rounded-md border border-slate-600 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Run Simulation
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
          >
            Auto-Fix with Codex
          </button>
        </div>
      </aside>
    </main>
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
