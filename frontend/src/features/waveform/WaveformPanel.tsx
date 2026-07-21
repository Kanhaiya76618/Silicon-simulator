import { useMemo, useState } from "react";

const signals = [
  { name: "clk", values: [0, 1, 0, 1, 0, 1, 0, 1], color: "#38bdf8" },
  { name: "a[3:0]", values: [1, 1, 3, 3, 7, 7, 2, 2], color: "#a78bfa" },
  { name: "b[3:0]", values: [2, 2, 2, 4, 4, 4, 1, 1], color: "#2dd4bf" },
  { name: "result[3:0]", values: [3, 3, 5, 7, 11, 11, 3, 3], color: "#fbbf24" },
  { name: "overflow", values: [0, 0, 0, 0, 1, 1, 0, 0], color: "#fb7185" },
];

function trace(values: number[], row: number, step: number) { return values.map((value, index) => `${index === 0 ? "M" : "L"}${index * step},${row - value * 13}`).join(" "); }

export function WaveformPanel() {
  const [zoom, setZoom] = useState(1.2);
  const [cursor, setCursor] = useState(4);
  const [query, setQuery] = useState("");
  const visibleSignals = useMemo(() => signals.filter((signal) => signal.name.includes(query.toLowerCase())), [query]);
  const width = Math.max(620, 720 * zoom);
  const step = width / 8;
  const chooseCursor = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = Math.floor(((event.clientX - rect.left) / rect.width) * 8);
    setCursor(Math.min(7, Math.max(0, next)));
  };
  return <section className="waveform-panel"><div className="waveform-toolbar"><div><p className="section-kicker">WAVEFORM EXPLORER</p><h2>Cycle-accurate signal evidence</h2></div><div className="waveform-tools"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find signal" aria-label="Find signal" /><button onClick={() => setZoom((value) => Math.max(.7, value - .2))}>−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(2.4, value + .2))}>+</button></div></div><div className="waveform-body"><aside>{visibleSignals.map((signal) => <span key={signal.name}><i style={{ background: signal.color }} />{signal.name}</span>)}</aside><div className="waveform-scroll"><svg viewBox={`0 0 ${width} ${visibleSignals.length * 58 + 28}`} width={width} height={visibleSignals.length * 58 + 28} onClick={chooseCursor}><defs><pattern id="grid" width={step} height="58" patternUnits="userSpaceOnUse"><path d={`M ${step} 0 L 0 0 0 58`} fill="none" stroke="#253856" strokeWidth="1" /></pattern></defs><rect width={width} height="100%" fill="url(#grid)" />{visibleSignals.map((signal, index) => <g key={signal.name}><path d={trace(signal.values, index * 58 + 40, step)} fill="none" stroke={signal.color} strokeWidth="3" strokeLinejoin="round" />{signal.name.includes("[") && signal.values.map((value, tick) => <text key={tick} x={tick * step + 6} y={index * 58 + 22} fill="#b6c7df" fontSize="10">0x{value.toString(16)}</text>)}</g>)}<line x1={(cursor + .5) * step} x2={(cursor + .5) * step} y1="0" y2="100%" stroke="#f8fafc" strokeWidth="2" /><rect x={(cursor + .5) * step - 24} y="3" width="48" height="17" rx="4" fill="#e0f2fe" /><text x={(cursor + .5) * step - 16} y="15" fill="#075985" fontSize="10">T {cursor}</text></svg></div></div><div className="waveform-readout">Cursor {cursor} · {visibleSignals.map((signal) => <span key={signal.name}>{signal.name}: <b>{signal.name.includes("[") ? `0x${signal.values[cursor].toString(16)}` : signal.values[cursor]}</b></span>)}</div></section>;
}
