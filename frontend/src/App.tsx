import Editor from "@monaco-editor/react";
import { Background, Controls, ReactFlow, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { CircuitScene } from "./components/CircuitScene";
import LandingPage from "./components/LandingPage";
import { RTLGateScene } from "./components/RTLGateScene";
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

const files = ['cpu_top.v', 'fetch.v', 'decode.v', 'execute.v', 'memory.v', 'writeback.v', 'hazard_unit.v'];

function Workspace() {
  const prompt = useHardwareStore((state) => state.prompt);
  const setPrompt = useHardwareStore((state) => state.setPrompt);
  const verilogCode = useHardwareStore((state) => state.verilogCode);
  const setVerilogCode = useHardwareStore((state) => state.setVerilogCode);
  const isGenerating = useHardwareStore((state) => state.isGenerating);
  
  const [status, setStatus] = useState<'Ready' | 'Running' | 'Issue detected'>('Ready');
  const [autoFix, setAutoFix] = useState(false);
  const [selectedFile, setSelectedFile] = useState(files[0]);
  const [activeTab, setActiveTab] = useState<'workspace' | 'architecture' | 'simulate' | 'gates' | 'export'>('workspace');
  const [activeEditorTab, setActiveEditorTab] = useState("design.v");
  const [activeOutputTab, setActiveOutputTab] = useState("Waveforms");

  const editorTabs = ["design.v", "testbench.v"];
  const outputTabs = ["Waveforms", "Logs"];

  function runSimulation() {
    setStatus('Running');
    window.setTimeout(() => setStatus('Issue detected'), 1100);
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
          <button type="button" onClick={runSimulation} disabled={status === 'Running'} className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50">
            ▶ Run Simulation
          </button>
          <button type="button" onClick={() => setAutoFix(true)} className="rounded border border-blue-500/40 bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-300 hover:bg-blue-900/50">
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
                  className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                >
                  {isGenerating ? "Generating…" : "Generate"}
                </button>
              </div>

              <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-400">
                <span>PROJECT FILES</span>
              </div>
              <div className="flex-1 overflow-y-auto rounded-md border border-slate-700/60 bg-[#111827] p-1">
                {files.map((file) => (
                  <button
                    key={file}
                    type="button"
                    onClick={() => setSelectedFile(file)}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs ${selectedFile === file ? 'bg-blue-600/30 text-blue-200 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    <span>◈ {file}</span>
                    <small className="text-[10px] text-slate-500">{file === 'cpu_top.v' ? '4.2 KB' : '2.1 KB'}</small>
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col border-r border-slate-700/60 bg-[#111827]">
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-700/60 bg-[#0f172a] px-3">
                <div className="flex items-center gap-2">
                  {editorTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveEditorTab(tab)}
                      className={`flex h-10 items-center border-b-2 px-3 text-xs transition ${
                        activeEditorTab === tab ? "border-blue-500 text-white font-medium" : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-500 font-mono">Editing {selectedFile}</span>
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
                {activeOutputTab === "Waveforms" ? (
                  <Waveform />
                ) : (
                  <div className="h-full rounded-md border border-slate-700/60 bg-[#111827] p-3 font-mono text-xs text-slate-400">
                    Simulation logs will appear here.
                  </div>
                )}
              </div>

              <div className="h-64 border-t border-slate-700/60 p-2">
                <div className="h-full w-full overflow-hidden rounded-md border border-slate-700/60 bg-[#0b1220]">
                  <ReactFlow defaultNodes={flowNodes} fitView colorMode="dark" style={{ backgroundColor: "#0b1220" }}>
                    <Background gap={16} size={1} color="#334155" />
                    <Controls />
                  </ReactFlow>
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'architecture' && <Architecture onOpen3D={() => setActiveTab('gates')} />}
        {activeTab === 'simulate' && <Simulation onAutoFix={() => setAutoFix(true)} onRun={runSimulation} status={status} />}
        {activeTab === 'gates' && <div className="h-full w-full bg-[#0b1220] p-4"><RTLGateScene /></div>}
        {activeTab === 'export' && <ExportPanel />}
      </main>

      {autoFix && <AutoFix onClose={() => setAutoFix(false)} onApply={() => { setStatus('Ready'); setAutoFix(false); }} />}
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

function Simulation({ onAutoFix, onRun, status }: { onAutoFix: () => void; onRun: () => void; status: string }) {
  return (
    <section className="feature-view simulation-view p-6 text-slate-200 w-full overflow-y-auto">
      <div className="feature-top flex justify-between items-center mb-6">
        <div>
          <p className="eyebrow text-xs text-blue-400 font-mono">ZERO-SETUP BROWSER SIMULATION</p>
          <h2 className="text-2xl font-bold text-white mt-1">Testbench proof, not just generated code.</h2>
          <p className="text-slate-400 text-sm mt-1">Verilator WASM runs the testbench locally and streams a VCD trace into the waveform renderer.</p>
        </div>
        <button type="button" className="run bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium" onClick={onRun}>
          ▶ Run testbench
        </button>
      </div>
      <div className="simulation-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <article className="glass test-card bg-slate-900/80 border border-slate-700 p-4 rounded flex justify-between items-start">
          <div className="flex gap-3">
            <span className="check text-emerald-400 font-bold">✓</span>
            <div>
              <b className="text-white text-sm">Reset sequence</b>
              <p className="text-xs text-slate-400 mt-1">PC initializes to 0x00400000.</p>
            </div>
          </div>
          <small className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded">PASS</small>
        </article>
        <article className="glass test-card bg-slate-900/80 border border-slate-700 p-4 rounded flex justify-between items-start">
          <div className="flex gap-3">
            <span className="check text-emerald-400 font-bold">✓</span>
            <div>
              <b className="text-white text-sm">ALU forwarding</b>
              <p className="text-xs text-slate-400 mt-1">RAW dependency resolved at cycle 38.</p>
            </div>
          </div>
          <small className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded">PASS</small>
        </article>
        <article className="glass test-card failing bg-slate-900/80 border border-rose-800/60 p-4 rounded flex justify-between items-start">
          <div className="flex gap-3">
            <span className="check text-rose-400 font-bold">!</span>
            <div>
              <b className="text-white text-sm">Load-use branch hazard</b>
              <p className="text-xs text-slate-400 mt-1">Forwarding mismatch at cycle 42.</p>
            </div>
          </div>
          <small className="text-[10px] bg-rose-950 text-rose-300 border border-rose-700/50 px-2 py-0.5 rounded">FAIL</small>
        </article>
      </div>
      <div className="failure-evidence glass bg-slate-900/90 border border-rose-900/40 p-5 rounded flex items-center justify-between">
        <div>
          <p className="eyebrow text-xs text-rose-400 font-mono">ASSERTION EVIDENCE</p>
          <h3 className="text-lg font-bold text-white mt-1">branch_target_e differed by one clock cycle</h3>
          <p className="text-xs text-slate-400 mt-1">VCD cursor: 1.42 µs · Module: execute.v · Signal group highlighted in red</p>
        </div>
        <button type="button" className="autofix bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium" onClick={onAutoFix}>
          ✦ Auto-Fix with Codex
        </button>
      </div>
      <p className="sim-status mt-4 text-xs text-slate-400">Simulation status: <b className="text-white">{status}</b></p>
    </section>
  );
}

function ExportPanel() {
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
        <select aria-label="Target FPGA board" className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-3 py-2 outline-none">
          <option>IceStick FPGA</option>
          <option>Arty A7</option>
          <option>iCEBreaker</option>
        </select>
        <button type="button" className="run bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-xs font-medium">
          Export hardware package
        </button>
      </div>
    </section>
  );
}

function Waveform() {
  const signals = ['clk', 'pc[31:0]', 'instruction[31:0]', 'alu_result[31:0]', 'mem_read', 'branch_taken', 'hazard_stall'];
  return (
    <section className="waveform glass h-full rounded-md border border-slate-700/60 bg-[#111827] p-3 flex flex-col">
      <div className="wave-head flex justify-between items-center pb-2 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button type="button" className="hover:text-white">↤</button>
          <button type="button" className="hover:text-white">◀</button>
          <button type="button" className="play bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] hover:bg-blue-500">▶</button>
          <button type="button" className="hover:text-white">▶</button>
          <button type="button" className="hover:text-white">↦</button>
          <span className="ml-2 font-mono">Cycle <b className="text-white">142 / 512</b></span>
        </div>
        <div className="flex gap-2">
          <button type="button" className="hover:text-white">−</button>
          <button type="button" className="hover:text-white">＋</button>
        </div>
      </div>
      <div className="wave-body flex-1 flex overflow-hidden pt-2 font-mono text-xs">
        <div className="signal-list w-36 shrink-0 flex flex-col justify-around text-slate-400 pr-2 border-r border-slate-800">
          {signals.map((signal, i) => (
            <span key={signal} className="truncate flex items-center gap-1.5">
              <i className={`dot h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-blue-400' : i === 6 ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              {signal}
            </span>
          ))}
        </div>
        <div className="traces flex-1 relative overflow-x-auto pl-2">
          <div className="ruler text-[10px] text-slate-600 mb-1 border-b border-slate-800 pb-1">
            0　　40　　80　　120　　160　　200　　240
          </div>
          {signals.map((signal, i) => (
            <div className="trace h-6 my-1" key={signal}>
              <svg viewBox="0 0 700 28" preserveAspectRatio="none" className="h-full w-full stroke-blue-400 fill-none stroke-[1.5]">
                <path d={i === 0 ? 'M0 21H25V5H50V21H75V5H100V21H125V5H150V21H175V5H200V21H225V5H250V21H275V5H300V21H325V5H350V21H375V5H400V21H425V5H450V21H475V5H500V21H525V5H550V21H575V5H600V21H625V5H650V21H700' : i === 6 ? 'M0 21H185V5H235V21H700' : 'M0 21H100V5H275V21H440V5H700'} />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AutoFix({ onClose, onApply }: { onClose: () => void; onApply: () => void }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <aside className="fix-panel w-full max-w-lg rounded-lg border border-slate-700 bg-[#0f172a] p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fix-header flex items-start justify-between border-b border-slate-700/60 pb-4">
          <div>
            <p className="text-xs font-mono text-blue-400">✦ AUTO-FIX WITH AI</p>
            <h2 className="text-lg font-bold text-white mt-1">Issue identified</h2>
            <span className="text-xs text-rose-400 font-medium">Branch forwarding mismatch at cycle 42</span>
          </div>
          <button type="button" className="text-slate-400 hover:text-white text-xl" onClick={onClose}>×</button>
        </div>
        <div className="fix-content py-4 space-y-4">
          <div className="issue rounded bg-slate-900 p-3 text-xs border border-slate-800">
            <b className="text-amber-400">△ Pipeline hazard</b>
            <p className="text-slate-300 mt-1">The forwarding unit misses a RAW hazard when a load is followed immediately by a branch. The target is computed one cycle late.</p>
          </div>
          <p className="label text-[10px] font-mono tracking-wider text-slate-400">PROPOSED PATCH</p>
          <pre className="rounded bg-black/50 p-3 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800">
            <span className="text-rose-400">- assign flush_e = branch_taken;</span>{'\n'}
            <strong className="text-emerald-400">+ assign flush_e = branch_taken || stall_f;</strong>{'\n'}
            <strong className="text-emerald-400">+ assign hazard_stall = stall_f;</strong>
          </pre>
        </div>
        <div className="fix-actions flex items-center justify-between border-t border-slate-700/60 pt-4">
          <button type="button" className="apply rounded bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500" onClick={onApply}>
            ✦ Apply patch
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
