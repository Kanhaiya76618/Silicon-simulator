import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls, Text } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type GateKind = 'AND' | 'XOR' | 'NOT' | 'MUX' | 'DFF';
type GateData = { id: string; kind: GateKind; label: string; pos: [number, number, number]; module: string; signals: string };
const gates: GateData[] = [
  { id: 'pc-mux', kind: 'MUX', label: 'PC MUX', pos: [-5, 1.4, 0], module: 'fetch.v', signals: 'pc_src, pc_next' },
  { id: 'pc-dff', kind: 'DFF', label: 'PC REGISTER', pos: [-2.8, 1.4, 0], module: 'fetch.v', signals: 'clk, rst_n, pc_out' },
  { id: 'decode-and', kind: 'AND', label: 'STALL DETECT', pos: [-0.4, 1.4, 0], module: 'hazard_unit.v', signals: 'rs1_d, rd_e, mem_read_e' },
  { id: 'forward-xor', kind: 'XOR', label: 'FORWARD CMP', pos: [2.1, 1.4, 0], module: 'execute.v', signals: 'forward_a_e, forward_b_e' },
  { id: 'branch-not', kind: 'NOT', label: 'BRANCH GUARD', pos: [4.8, 1.4, 0], module: 'execute.v', signals: 'branch_taken, flush_e' },
  { id: 'result-mux', kind: 'MUX', label: 'RESULT MUX', pos: [-1.8, -1.8, 0], module: 'writeback.v', signals: 'alu_result, mem_data, write_data' },
  { id: 'write-dff', kind: 'DFF', label: 'REGFILE WRITE', pos: [1.5, -1.8, 0], module: 'writeback.v', signals: 'rd_w, reg_write, write_data' },
];
const edges: Array<[string, string, string]> = [['pc-mux', 'pc-dff', '#2563eb'], ['pc-dff', 'decode-and', '#14b8a6'], ['decode-and', 'forward-xor', '#f59e0b'], ['forward-xor', 'branch-not', '#ef4444'], ['decode-and', 'result-mux', '#7c3aed'], ['result-mux', 'write-dff', '#14b8a6']];

function shapeFor(kind: GateKind) {
  const s = new THREE.Shape();
  if (kind === 'AND') { s.moveTo(-.7, -.65); s.lineTo(0, -.65); s.absarc(0, 0, .65, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-.7, .65); s.closePath(); }
  if (kind === 'XOR') { s.moveTo(-.72, -.65); s.quadraticCurveTo(-.12, -.45, .68, 0); s.quadraticCurveTo(-.12, .45, -.72, .65); s.quadraticCurveTo(-.4, 0, -.72, -.65); }
  if (kind === 'NOT') { s.moveTo(-.68, -.65); s.lineTo(-.68, .65); s.lineTo(.62, 0); s.closePath(); }
  if (kind === 'MUX') { s.moveTo(-.62, -.68); s.lineTo(.62, -.42); s.lineTo(.62, .42); s.lineTo(-.62, .68); s.closePath(); }
  if (kind === 'DFF') { s.moveTo(-.72, -.62); s.lineTo(.72, -.62); s.lineTo(.72, .62); s.lineTo(-.72, .62); s.closePath(); }
  return s;
}

function Gate({ gate, selected, onSelect }: { gate: GateData; selected: boolean; onSelect: (gate: GateData) => void }) {
  const ref = useRef<THREE.Mesh>(null!);
  const geometry = useMemo(() => new THREE.ExtrudeGeometry(shapeFor(gate.kind), { depth: .34, bevelEnabled: true, bevelSize: .035, bevelThickness: .04, bevelSegments: 2 }), [gate.kind]);
  useFrame(({ clock }) => { ref.current.position.z = Math.sin(clock.elapsedTime + gate.pos[0]) * .06; ref.current.rotation.z = selected ? Math.sin(clock.elapsedTime * 2) * .035 : 0; });
  const colors: Record<GateKind, string> = { AND: '#f59e0b', XOR: '#7c3aed', NOT: '#ef4444', MUX: '#2563eb', DFF: '#14b8a6' };
  return <group position={gate.pos}><mesh ref={ref} geometry={geometry} onClick={(e) => { e.stopPropagation(); onSelect(gate); }}><meshPhysicalMaterial color="#f8fafc" emissive={colors[gate.kind]} emissiveIntensity={selected ? .62 : .18} roughness={.23} metalness={.32} /></mesh>{gate.kind === 'NOT' && <mesh position={[.84, 0, .16]}><sphereGeometry args={[.12, 16, 16]} /><meshStandardMaterial color={colors.NOT} emissive={colors.NOT} emissiveIntensity={.4} /></mesh>}<Text position={[0, -.95, .2]} fontSize={.21} color="#334155" anchorX="center">{gate.label}</Text><Text position={[0, -.66, .2]} fontSize={.14} color={colors[gate.kind]} anchorX="center">{gate.kind}</Text></group>;
}

function GateNetwork({ selected, setSelected }: { selected: GateData; setSelected: (gate: GateData) => void }) {
  const positionById = Object.fromEntries(gates.map((gate) => [gate.id, gate.pos]));
  return <><ambientLight intensity={1.3} /><pointLight position={[0, 4, 6]} intensity={30} color="#60a5fa" /><pointLight position={[-5, -3, 2]} intensity={14} color="#a78bfa" />{edges.map(([from, to, color]) => <Line key={`${from}-${to}`} points={[positionById[from], positionById[to]]} color={color} lineWidth={2} />)}{gates.map((gate) => <Gate key={gate.id} gate={gate} selected={selected.id === gate.id} onSelect={setSelected} />)}<OrbitControls enablePan enableDamping minDistance={8} maxDistance={18} /></>;
}

export function RTLGateScene() {
  const [selected, setSelected] = useState(gates[2]);
  return <section className="gate-view"><div className="feature-top"><div><p className="eyebrow">THREE-DIMENSIONAL RTL GATE NETLIST</p><h2>Named logic gates, live connections, real module context.</h2><p>Click a gate to inspect its source module and RTL signals. Colored links show active data, control, hazard, and error paths.</p></div><div className="gate-legend"><span><i className="blue" />data</span><span><i className="teal" />clock</span><span><i className="amber" />hazard</span><span><i className="red" />error</span></div></div><div className="gate-stage glass"><Canvas camera={{ position: [0, 1, 12], fov: 45 }}><color attach="background" args={['#f8fafc']} /><GateNetwork selected={selected} setSelected={setSelected} /></Canvas><aside className="gate-inspector"><p>SELECTED GATE</p><h3>{selected.label}</h3><span className="gate-kind">{selected.kind} GATE</span><dl><dt>RTL module</dt><dd>{selected.module}</dd><dt>Connected signals</dt><dd>{selected.signals}</dd><dt>Logic state</dt><dd className="teal-text">active @ cycle 142</dd></dl><button>Highlight RTL lines</button></aside></div></section>;
}
