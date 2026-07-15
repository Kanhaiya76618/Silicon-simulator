import { useState } from 'react';
import { CircuitScene } from './components/CircuitScene';

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
      <section className="hero"><p className="eyebrow">INTERACTIVE HDL WORKSPACE</p><h1>Explore hardware beyond the waveform.</h1><p>Write Verilog, run a browser simulation, then inspect every signal as a live 3D pipeline.</p><div className="badges"><span>Verilog</span><span>VCD</span><span>WebAssembly</span><span>3D View</span></div></section>
      <section className="workspace">
        <aside className="files glass panel"><div className="panel-title">▱ Project files <button>＋</button></div>{files.map((file) => <button className={`file ${selectedFile === file ? 'active' : ''}`} key={file} onClick={() => setSelectedFile(file)}><span>◈</span>{file}<small>{file === 'cpu_top.v' ? '4.2 KB' : '2.1 KB'}</small></button>)}<button className="add-file">＋ Add file</button></aside>
        <section className="editor panel"><div className="editor-bar"><span><b>Verilog</b> {selectedFile}</span><span>16 lines · Format</span></div><div className="code">{code.split('\n').map((line, i) => <div className={i === 13 ? 'warn-line' : ''} key={i}><em>{String(i + 1).padStart(2, '0')}</em><code>{line}</code></div>)}</div></section>
        <section className="scene-panel glass panel"><CircuitScene /></section>
      </section>
      <Waveform />
    </main>
    {autoFix && <AutoFix onClose={() => setAutoFix(false)} onApply={() => { setStatus('Ready'); setAutoFix(false); }} />}
  </div>;
}

function Waveform() {
  const signals = ['clk', 'pc[31:0]', 'instruction[31:0]', 'alu_result[31:0]', 'mem_read', 'branch_taken', 'hazard_stall'];
  return <section className="waveform glass"><div className="wave-head"><div><button>↤</button><button>◀</button><button className="play">▶</button><button>▶</button><button>↦</button><span>Cycle <b>142 / 512</b></span></div><div><button>−</button><button>＋</button><button>⌃</button></div></div><div className="wave-body"><div className="signal-list">{signals.map((signal, i) => <span key={signal}><i className={`dot dot-${i}`} />{signal}</span>)}</div><div className="traces"><div className="ruler">0　　40　　80　　120　　160　　200　　240</div>{signals.map((signal, i) => <div className={`trace trace-${i}`} key={signal}><svg viewBox="0 0 700 28" preserveAspectRatio="none"><path d={i === 0 ? 'M0 21H25V5H50V21H75V5H100V21H125V5H150V21H175V5H200V21H225V5H250V21H275V5H300V21H325V5H350V21H375V5H400V21H425V5H450V21H475V5H500V21H525V5H550V21H575V5H600V21H625V5H650V21H700' : i === 6 ? 'M0 21H185V5H235V21H700' : 'M0 21H100V5H275V21H440V5H700'} /></svg></div>)}<div className="playhead"><span>T = 1.42 μs</span></div></div></div></section>;
}

function AutoFix({ onClose, onApply }: { onClose: () => void; onApply: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><aside className="fix-panel" onMouseDown={(e) => e.stopPropagation()}><div className="fix-header"><button onClick={onClose}>×</button><p>✦ AUTO-FIX WITH AI</p><h2>Issue identified</h2><span>Branch forwarding mismatch at cycle 42</span></div><div className="fix-content"><div className="issue"><b>△ Pipeline hazard</b><p>The forwarding unit misses a RAW hazard when a load is followed immediately by a branch. The target is computed one cycle late.</p></div><p className="label">PROPOSED PATCH</p><pre><span>- assign flush_e = branch_taken;</span>{'\n'}<strong>+ assign flush_e = branch_taken || stall_f;</strong>{'\n'}<strong>+ assign hazard_stall = stall_f;</strong></pre></div><div className="fix-actions"><button className="apply" onClick={onApply}>✦ Apply patch</button><button>View waveform evidence →</button><small>AI generated — verify before synthesizing.</small></div></aside></div>;
}
