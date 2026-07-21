import type { SimulationRun } from "@silicon-canvas/shared/contracts";
import { parseVcd, waveformSegments, type LogicValue, type VcdChange, type VcdSignal } from "@silicon-canvas/vcd-core";
import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import "./WaveformPanel.css";

const ROW_HEIGHT = 56;
const SIGNAL_COLOURS = ["#38bdf8", "#a78bfa", "#2dd4bf", "#fbbf24", "#fb7185", "#60a5fa", "#34d399"];

function isScalar(value: LogicValue) {
  return /^[01xXzZ]$/.test(value);
}

function displayValue(value: LogicValue, width: number) {
  if (isScalar(value)) return value.toUpperCase();
  if (/^[01]+$/.test(value) && width > 1) return `0x${Number.parseInt(value, 2).toString(16).toUpperCase()}`;
  return value.toUpperCase();
}

function valueAt(changes: VcdChange[], time: number) {
  let result: LogicValue = changes[0]?.value ?? "x";
  for (const change of changes) {
    if (change.time > time) break;
    result = change.value;
  }
  return result;
}

function scalarY(value: LogicValue, rowTop: number) {
  if (value === "1") return rowTop + 15;
  if (value === "0") return rowTop + 39;
  return rowTop + 27;
}

export function WaveformPanel({ simulation, onAutoFix, isAutoFixing = false }: { simulation?: SimulationRun; onAutoFix?: () => void; isAutoFixing?: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [cursorRatio, setCursorRatio] = useState(.5);
  const [query, setQuery] = useState("");
  const parsed = useMemo(() => {
    if (!simulation?.vcdContent) return null;
    try { return parseVcd(simulation.vcdContent); } catch { return null; }
  }, [simulation?.vcdContent]);
  const visibleSignals = useMemo(() => (parsed?.signals ?? [])
    .filter((signal) => signal.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 28), [parsed, query]);
  const endTime = Math.max(parsed?.endTime ?? 0, 1);
  const width = Math.max(720, Math.round(920 * zoom));
  const plotHeight = Math.max(1, visibleSignals.length) * ROW_HEIGHT;
  const cursorTime = Math.round(cursorRatio * endTime);
  const chooseCursor = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursorRatio(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
  };

  const renderSignal = (signal: VcdSignal, index: number) => {
    const changes = parsed?.changesBySignalId[signal.id] ?? [];
    const segments = waveformSegments(changes, endTime);
    const rowTop = index * ROW_HEIGHT;
    const colour = SIGNAL_COLOURS[index % SIGNAL_COLOURS.length];
    if (!segments.length) return <text key={signal.id} x="10" y={rowTop + 32} fill="#718aa5" fontSize="10">No captured values</text>;
    if (!isScalar(segments[0].value)) return <g key={signal.id}>{segments.map((segment, segmentIndex) => {
      const x = (segment.from / endTime) * width;
      const segmentWidth = Math.max(1, ((segment.to - segment.from) / endTime) * width);
      return <g key={`${signal.id}-${segmentIndex}`}><rect x={x} y={rowTop + 12} width={segmentWidth} height="30" rx="3" fill="#102d47" stroke={colour} strokeWidth="1" /><text x={x + 6} y={rowTop + 31} fill="#dceafa" fontSize="10">{segmentWidth > 42 ? displayValue(segment.value, signal.width) : ""}</text></g>;
    })}</g>;
    return <g key={signal.id}>{segments.map((segment, segmentIndex) => {
      const x1 = (segment.from / endTime) * width;
      const x2 = (segment.to / endTime) * width;
      const y = scalarY(segment.value, rowTop);
      const previous = segments[segmentIndex - 1];
      return <g key={`${signal.id}-${segmentIndex}`}>{previous && <line x1={x1} x2={x1} y1={scalarY(previous.value, rowTop)} y2={y} stroke={colour} strokeWidth="2" />}<line x1={x1} x2={x2} y1={y} y2={y} stroke={colour} strokeWidth="2.5" /></g>;
    })}</g>;
  };

  if (!simulation) return <section className="waveform-panel waveform-empty"><p className="section-kicker">WAVEFORM EXPLORER</p><h2>Simulation evidence will appear here</h2><p>Generate a design, then select <b>Simulate</b>. Silicon Canvas will render the actual VCD signals and simulator output from that run.</p></section>;

  const status = simulation.status === "passed" ? "Passed" : simulation.status === "failed" ? "Failed" : simulation.status;
  return <section className="waveform-panel"><div className="waveform-toolbar"><div><p className="section-kicker">WAVEFORM EXPLORER</p><h2>Simulation evidence <span className={`waveform-status ${simulation.status}`}>{status}</span></h2></div><div className="waveform-tools"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find signal" aria-label="Find signal" disabled={!parsed} /><button type="button" onClick={() => setZoom((value) => Math.max(.65, value - .2))} disabled={!parsed} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(2.4, value + .2))} disabled={!parsed} aria-label="Zoom in">+</button></div></div>
    {parsed ? <><div className="waveform-meta"><span>{visibleSignals.length} of {parsed.signals.length} signals</span><span>Timescale {parsed.timescale ?? "unknown"}</span><span>Cursor {cursorTime}</span></div><div className="waveform-body"><aside>{visibleSignals.map((signal, index) => <span key={signal.id}><i style={{ background: SIGNAL_COLOURS[index % SIGNAL_COLOURS.length] }} />{signal.name}</span>)}</aside><div className="waveform-scroll"><svg viewBox={`0 0 ${width} ${plotHeight}`} width={width} height={plotHeight} onClick={chooseCursor} role="img" aria-label="Simulation waveform"><defs><pattern id="waveform-grid" width={width / 10} height={ROW_HEIGHT} patternUnits="userSpaceOnUse"><path d={`M ${width / 10} 0 L 0 0 0 ${ROW_HEIGHT}`} fill="none" stroke="#253856" strokeWidth="1" /></pattern></defs><rect width={width} height={plotHeight} fill="url(#waveform-grid)" />{visibleSignals.map(renderSignal)}<line x1={cursorRatio * width} x2={cursorRatio * width} y1="0" y2={plotHeight} stroke="#f8fafc" strokeWidth="1.5" /></svg></div></div><div className="waveform-readout">{visibleSignals.map((signal, index) => <span key={signal.id}><i style={{ background: SIGNAL_COLOURS[index % SIGNAL_COLOURS.length] }} />{signal.name}: <b>{displayValue(valueAt(parsed.changesBySignalId[signal.id] ?? [], cursorTime), signal.width)}</b></span>)}</div></> : <div className="waveform-none"><h3>No VCD trace was produced</h3><p>The simulator returned <b>{status.toLowerCase()}</b>. Check the run log below to see what happened.</p></div>}
    <details className="simulation-log" open={simulation.status !== "passed"}><summary>Simulator log</summary><pre>{simulation.logs || "No simulator output was returned."}</pre></details>
    {simulation.status === "failed" && onAutoFix && <div className="autofix-action"><div><b>Repair this failing version</b><p>Debug Agent will create a new version, apply its patch, and run verification again.</p></div><button className="button-primary" type="button" onClick={onAutoFix} disabled={isAutoFixing}>{isAutoFixing ? "Repairing…" : "✦ Auto-Fix & rerun"}</button></div>}
  </section>;
}
