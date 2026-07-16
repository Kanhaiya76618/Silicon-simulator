import { useState } from 'react';
import { CircuitScene } from './components/CircuitScene';
import { RTLGateScene } from './components/RTLGateScene';

const files = ['cpu_top.v', 'fetch.v', 'decode.v', 'execute.v', 'memory.v', 'writeback.v', 'hazard_unit.v'];
const code = `module cpu_top(
  input wire clk,
  input wire rst_n,
  output wire [31:0] pc_out
);

  wire stall_f, stall_d, flush_e;
  wire [1:0] forward_a_e;

  fetch u_fetch (.clk(clk), .rst_n(rst_n),
    .stall(stall_f), .pc_out(pc_out));

  // Hazard unit detects RAW dependencies
  assign stall_f = (rs1_d == rd_e) && mem_read_e;
  assign stall_d = stall_f;
  assign flush_e = branch_taken;
endmodule`;

export default function App() {
  const [status, setStatus] = useState<'Ready' | 'Running' | 'Issue detected'>('Ready');
  const [autoFix, setAutoFix] = useState(false);
  const [selectedFile, setSelectedFile] = useState(files[0]);
  const [activeTab, setActiveTab] = useState<'workspace' | 'architecture' | 'simulate' | 'gates' | 'export'>('workspace');

  function runSimulation() {
    setStatus('Running');
    window.setTimeout(() => setStatus('Issue detected'), 1100);
  }

  return <div className="app-shell">
    <div className="ambient ambient-blue" /><div className="ambient ambient-teal" /><div className="ambient ambient-violet" />
    <header className="top-nav glass">
      <div className="brand"><span className="brand-mark">S</span><span>Silicon Canvas</span><small>BETA</small></div>
      <button className="project-picker">RISC-V Pipeline CPU <span>⌄</span></button>
      <div className="nav-actions"><span className={`status ${status.replace(' ', '-').toLowerCase()}`}><i />{status}</span><button className="ghost">Share</button><button className="run" onClick={runSimulation} disabled={status === 'Running'}>▶ Run Simulation</button><button className="autofix" onClick={() => setAutoFix(true)}>✦ Auto-Fix</button></div>
    </header>

    <main>
      <section className="hero"><p className="eyebrow">PROMPT → RTL → PROOF</p><h1>From plain English to live silicon.</h1><p>Generate synthesizable hardware, inspect the RTL architecture, simulate in the browser, and resolve timing hazards with an agentic debug loop.</p><div className="badges"><span>Verilog</span><span>Testbench</span><span>VCD</span><span>WebAssembly</span><span>FPGA-ready</span></div></section>
      <nav className="product-tabs" aria-label="Design workspace tabs">
        <Tab label="Design workspace" active={activeTab === 'workspace'} onClick={() => setActiveTab('workspace')} />
        <Tab label="Architecture" active={activeTab === 'architecture'} onClick={() => setActiveTab('architecture')} />
        <Tab label="Simulation" active={activeTab === 'simulate'} onClick={() => setActiveTab('simulate')} />
        <Tab label="3D RTL gates" active={activeTab === 'gates'} onClick={() => setActiveTab('gates')} />
        <Tab label="FPGA export" active={activeTab === 'export'} onClick={() => setActiveTab('export')} />
      </nav>
      {activeTab === 'workspace' && <>
      <section className="workspace">
        <aside className="files glass panel"><div className="panel-title">▱ Project files <button>＋</button></div>{files.map((file) => <button className={`file ${selectedFile === file ? 'active' : ''}`} key={file} onClick={() => setSelectedFile(file)}><span>◈</span>{file}<small>{file === 'cpu_top.v' ? '4.2 KB' : '2.1 KB'}</small></button>)}<button className="add-file">＋ Add file</button></aside>
        <section className="editor panel"><div className="editor-bar"><span><b>Verilog</b> {selectedFile}</span><span>16 lines · Format</span></div><div className="code">{code.split('\n').map((line, i) => <div className={i === 13 ? 'warn-line' : ''} key={i}><em>{String(i + 1).padStart(2, '0')}</em><code>{line}</code></div>)}</div></section>
        <section className="scene-panel glass panel"><CircuitScene /></section>
      </section>
      <Waveform />
      </>}
      {activeTab === 'architecture' && <Architecture onOpen3D={() => setActiveTab('gates')} />}
      {activeTab === 'simulate' && <Simulation onAutoFix={() => setAutoFix(true)} onRun={runSimulation} status={status} />}
      {activeTab === 'gates' && <RTLGateScene />}
      {activeTab === 'export' && <ExportPanel />}
    </main>
    {autoFix && <AutoFix onClose={() => setAutoFix(false)} onApply={() => { setStatus('Ready'); setAutoFix(false); }} />}
  </div>;
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? 'tab active-tab' : 'tab'} onClick={onClick} aria-selected={active}>{label}</button>;
}

function Architecture({ onOpen3D }: { onOpen3D: () => void }) {
  const blocks = [['Fetch', 'Program counter · instruction memory'], ['Decode', 'Register file · control decode'], ['Execute', 'ALU · branch unit · forwarding'], ['Memory', 'Load/store interface'], ['Writeback', 'Result mux · register commit']];
  return <section className="feature-view architecture-view"><div className="feature-top"><div><p className="eyebrow">INTERACTIVE VISUAL RTL ARCHITECTURE</p><h2>Trace every block across RTL and waveform.</h2><p>Select a block to reveal its source module, signal group, and current cycle state.</p></div><button className="autofix" onClick={onOpen3D}>Open 3D RTL gates →</button></div><div className="architecture-canvas glass"><div className="arch-flow">{blocks.map(([name, detail], index) => <div className="arch-item" key={name}><button><strong>{name}</strong><span>{detail}</span><small>{['fetch.v', 'decode.v', 'execute.v', 'memory.v', 'writeback.v'][index]}</small></button>{index < blocks.length - 1 && <i>→</i>}</div>)}</div><div className="architecture-inspector"><b>Selected: Execute</b><span>Related RTL lines: 24–48</span><span>Waveform group: ALU, branch, forward_a, forward_b</span><span className="teal-text">Cycle 142: branch target active</span></div></div></section>;
}

function Simulation({ onAutoFix, onRun, status }: { onAutoFix: () => void; onRun: () => void; status: string }) {
  return <section className="feature-view simulation-view"><div className="feature-top"><div><p className="eyebrow">ZERO-SETUP BROWSER SIMULATION</p><h2>Testbench proof, not just generated code.</h2><p>Verilator WASM runs the testbench locally and streams a VCD trace into the waveform renderer.</p></div><button className="run" onClick={onRun}>▶ Run testbench</button></div><div className="simulation-grid"><article className="glass test-card"><span className="check">✓</span><div><b>Reset sequence</b><p>PC initializes to 0x00400000.</p></div><small>PASS</small></article><article className="glass test-card"><span className="check">✓</span><div><b>ALU forwarding</b><p>RAW dependency resolved at cycle 38.</p></div><small>PASS</small></article><article className="glass test-card failing"><span className="check">!</span><div><b>Load-use branch hazard</b><p>Forwarding mismatch at cycle 42.</p></div><small>FAIL</small></article></div><div className="failure-evidence glass"><div><p className="eyebrow">ASSERTION EVIDENCE</p><h3>branch_target_e differed by one clock cycle</h3><p>VCD cursor: 1.42 µs · Module: execute.v · Signal group highlighted in red</p></div><button className="autofix" onClick={onAutoFix}>✦ Auto-Fix with Codex</button></div><p className="sim-status">Simulation status: <b>{status}</b></p></section>;
}

function ExportPanel() {
  return <section className="feature-view export-view"><div className="feature-top"><div><p className="eyebrow">FPGA-READY ONE-CLICK EXPORT</p><h2>Take verified RTL onto real hardware.</h2><p>Package generated Verilog, pin constraints, and a reproducible Yosys/NextPNR build script.</p></div></div><div className="export-grid">{[['1', 'Choose board', 'IceStick FPGA'], ['2', 'Generate constraints', 'silicon_canvas.pcf'], ['3', 'Build package', 'Yosys + NextPNR']].map(([number, title, detail]) => <article className="glass export-step" key={number}><span>{number}</span><b>{title}</b><p>{detail}</p></article>)}</div><div className="export-actions glass"><select aria-label="Target FPGA board"><option>IceStick FPGA</option><option>Arty A7</option><option>iCEBreaker</option></select><button className="run">Export hardware package</button></div></section>;
}

function Waveform() {
  const signals = ['clk', 'pc[31:0]', 'instruction[31:0]', 'alu_result[31:0]', 'mem_read', 'branch_taken', 'hazard_stall'];
  return <section className="waveform glass"><div className="wave-head"><div><button>↤</button><button>◀</button><button className="play">▶</button><button>▶</button><button>↦</button><span>Cycle <b>142 / 512</b></span></div><div><button>−</button><button>＋</button><button>⌃</button></div></div><div className="wave-body"><div className="signal-list">{signals.map((signal, i) => <span key={signal}><i className={`dot dot-${i}`} />{signal}</span>)}</div><div className="traces"><div className="ruler">0　　40　　80　　120　　160　　200　　240</div>{signals.map((signal, i) => <div className={`trace trace-${i}`} key={signal}><svg viewBox="0 0 700 28" preserveAspectRatio="none"><path d={i === 0 ? 'M0 21H25V5H50V21H75V5H100V21H125V5H150V21H175V5H200V21H225V5H250V21H275V5H300V21H325V5H350V21H375V5H400V21H425V5H450V21H475V5H500V21H525V5H550V21H575V5H600V21H625V5H650V21H700' : i === 6 ? 'M0 21H185V5H235V21H700' : 'M0 21H100V5H275V21H440V5H700'} /></svg></div>)}<div className="playhead"><span>T = 1.42 μs</span></div></div></div></section>;
}

function AutoFix({ onClose, onApply }: { onClose: () => void; onApply: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><aside className="fix-panel" onMouseDown={(e) => e.stopPropagation()}><div className="fix-header"><button onClick={onClose}>×</button><p>✦ AUTO-FIX WITH AI</p><h2>Issue identified</h2><span>Branch forwarding mismatch at cycle 42</span></div><div className="fix-content"><div className="issue"><b>△ Pipeline hazard</b><p>The forwarding unit misses a RAW hazard when a load is followed immediately by a branch. The target is computed one cycle late.</p></div><p className="label">PROPOSED PATCH</p><pre><span>- assign flush_e = branch_taken;</span>{'\n'}<strong>+ assign flush_e = branch_taken || stall_f;</strong>{'\n'}<strong>+ assign hazard_stall = stall_f;</strong></pre></div><div className="fix-actions"><button className="apply" onClick={onApply}>✦ Apply patch</button><button>View waveform evidence →</button><small>AI generated — verify before synthesizing.</small></div></aside></div>;
}
