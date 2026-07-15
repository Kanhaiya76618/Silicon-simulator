import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Grid, Line, OrbitControls, Text } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';

const stages = [
  ['Fetch', -4, '#14b8a6'], ['Decode', -2, '#38bdf8'], ['Execute', 0, '#f59e0b'], ['Memory', 2, '#7c3aed'], ['Writeback', 4, '#14b8a6'],
] as const;

function Module({ name, x, color, active, select }: { name: string; x: number; color: string; active: boolean; select: () => void }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { ref.current.position.y = Math.sin(clock.elapsedTime * 1.4 + x) * 0.12; ref.current.rotation.y += active ? 0.008 : 0.001; });
  return <group position={[x, 0, 0]}><mesh ref={ref} onClick={select}><boxGeometry args={[1.35, 1.35, 1.35]} /><meshPhysicalMaterial color={active ? color : '#eff6ff'} emissive={color} emissiveIntensity={active ? 0.42 : 0.07} roughness={0.15} metalness={0.12} transparent opacity={0.82} /></mesh><mesh position={[0, 0, 0.7]}><boxGeometry args={[0.68, 0.68, 0.08]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} /></mesh><Text position={[0, -1.15, 0]} fontSize={0.28} color="#334155" anchorX="center">{name}</Text></group>;
}

function Pulse({ from, to, color }: { from: number; to: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { const t = (clock.elapsedTime * 0.75 + from) % 1; ref.current.position.x = from + (to - from) * t; (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI); });
  return <mesh ref={ref} position={[from, 0, 0]}><sphereGeometry args={[0.11, 16, 16]} /><meshBasicMaterial color={color} transparent /></mesh>;
}

function Pipeline({ selected, setSelected }: { selected: string; setSelected: (v: string) => void }) {
  return <><ambientLight intensity={1.1} /><pointLight position={[0, 4, 3]} intensity={25} color="#60a5fa" /><Grid position={[0, -1.35, 0]} args={[16, 16]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={18} /><Line points={stages.map(([, x]) => [x, 0, 0])} color="#94a3b8" lineWidth={1.2} />{stages.map(([name, x, color]) => <Module key={name} name={name} x={x} color={color} active={selected === name} select={() => setSelected(name)} />)}{stages.slice(0, -1).map(([, x], i) => <Pulse key={x} from={x} to={stages[i + 1][1]} color={i === 2 ? '#ef4444' : '#14b8a6'} />)}<OrbitControls enablePan={false} minDistance={7} maxDistance={14} /></>;
}

export function CircuitScene() {
  const [selected, setSelected] = useState('Execute');
  return <div className="scene"><div className="scene-heading"><span><i /> Live 3D pipeline</span><button onClick={() => setSelected('Execute')}>Reset view</button></div><Canvas camera={{ position: [0, 4.8, 8.5], fov: 45 }}><color attach="background" args={['#f8fafc']} /><Float floatIntensity={0.2}><Pipeline selected={selected} setSelected={setSelected} /></Float></Canvas><div className="scene-card"><b>{selected} stage</b><span>Cycle 142 · BEQ R6, R7, label</span><span className="hazard">● Hazard path monitored</span></div><div className="legend"><span><i className="blue" />Data</span><span><i className="teal" />Active</span><span><i className="amber" />Hazard</span></div></div>;
}
