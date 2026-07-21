import { useMemo, useState } from "react";
import "./RtlGatesPanel.css";

type ArchitectureModule = { name?: unknown; purpose?: unknown; inputs?: unknown; outputs?: unknown };

function asText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNames(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function RtlGatesPanel({ architecture }: { architecture: Record<string, unknown> }) {
  const [angle, setAngle] = useState(38);
  const modules = useMemo(() => {
    const raw = Array.isArray(architecture.modules) ? architecture.modules as ArchitectureModule[] : [];
    return raw.length ? raw : [{ name: "Generate a design", purpose: "Architecture modules will be projected here.", inputs: [], outputs: [] }];
  }, [architecture]);
  return <section className="gates-panel"><header><div><p className="section-kicker">3D RTL GATES</p><h2>Interactive module topology</h2><p>Rotate the generated architecture to inspect the logic layers and signal hand-offs.</p></div><button className="button-secondary" type="button" onClick={() => setAngle(38)}>Reset view</button></header><div className="gates-toolbar"><label>Camera tilt <input aria-label="Camera tilt" type="range" min="18" max="62" value={angle} onChange={(event) => setAngle(Number(event.target.value))} /></label><span>{angle}°</span><small>{modules.length} architecture modules</small></div><div className="gates-viewport"><div className="gates-stage" style={{ transform: `rotateX(${angle}deg) rotateZ(-15deg)` }}>{modules.map((module, index) => <article key={`${asText(module.name, "module")}-${index}`} style={{ transform: `translate3d(${index % 3 * 190 - 180}px, ${Math.floor(index / 3) * 150 - 70}px, ${index * 36}px)` }}><b>{String(index + 1).padStart(2, "0")}</b><h3>{asText(module.name, `module_${index + 1}`)}</h3><p>{asText(module.purpose, "Hardware module")}</p><div><span>IN {asNames(module.inputs).join(", ") || "—"}</span><span>OUT {asNames(module.outputs).join(", ") || "—"}</span></div></article>)}</div></div><footer><span><i /> Input / control signals</span><span><i /> Module logic</span><span><i /> Output hand-off</span></footer></section>;
}
