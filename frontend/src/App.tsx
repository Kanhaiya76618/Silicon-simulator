import Editor from "@monaco-editor/react";
import { Background, Controls, ReactFlow, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Route, Routes } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import { useHardwareStore } from "./store/hardwareStore";

const flowNodes: Node[] = [
  {
    id: "input",
    position: { x: 24, y: 48 },
    data: { label: "Input signal" },
  },
  {
    id: "logic",
    position: { x: 112, y: 164 },
    data: { label: "Logic block" },
  },
];

function Workspace() {
  const prompt = useHardwareStore((state) => state.prompt);
  const setPrompt = useHardwareStore((state) => state.setPrompt);
  const verilogCode = useHardwareStore((state) => state.verilogCode);
  const setVerilogCode = useHardwareStore((state) => state.setVerilogCode);
  const isGenerating = useHardwareStore((state) => state.isGenerating);

  return (
    <main className="flex h-screen overflow-hidden bg-[#1e1e1e] text-white">
      <aside className="flex w-80 shrink-0 flex-col border-r border-white/10 bg-[#252525] p-4">
        <div className="mb-4">
          <label htmlFor="design-prompt" className="mb-2 block text-sm font-medium text-gray-200">
            Describe your hardware
          </label>
          <textarea
            id="design-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="e.g. Create an 8-bit synchronous counter with reset"
            className="h-36 w-full resize-none rounded-lg border border-white/10 bg-[#171717] p-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          />
          <button
            type="button"
            disabled={isGenerating}
            className="mt-3 w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "Generating…" : "Generate"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a]">
          <ReactFlow defaultNodes={flowNodes} fitView>
            <Background gap={16} size={1} color="#3f3f46" />
            <Controls />
          </ReactFlow>
        </div>
      </aside>

      <section className="min-w-0 flex-1 border-r border-white/10 bg-[#1e1e1e]">
        <Editor
          height="100%"
          language="verilog"
          theme="vs-dark"
          value={verilogCode}
          onChange={(value) => setVerilogCode(value ?? "")}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            padding: { top: 16 },
          }}
        />
      </section>

      <aside className="flex w-[450px] shrink-0 items-center justify-center bg-gray-900 p-6">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-cyan-300">SIMULATION</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Waveform Viewer</h2>
          <p className="mt-2 text-sm text-gray-400">Generated waveforms will appear here.</p>
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
