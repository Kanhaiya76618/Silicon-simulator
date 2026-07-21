import type { ReactNode } from "react";
import "./ArchitecturePanel.css";

type ArchitectureModule = { name?: unknown; purpose?: unknown; inputs?: unknown; outputs?: unknown };
type ArchitectureConnection = { from?: unknown; to?: unknown; signal?: unknown };

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function values(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function list(items: string[], empty: string): ReactNode {
  return items.length ? items.map((item) => <span key={item}>{item}</span>) : <span className="architecture-empty">{empty}</span>;
}

export function ArchitecturePanel({ architecture }: { architecture: Record<string, unknown> }) {
  const modules = Array.isArray(architecture.modules) ? architecture.modules as ArchitectureModule[] : [];
  const connections = Array.isArray(architecture.connections) ? architecture.connections as ArchitectureConnection[] : [];
  const verificationPlan = values(architecture.verificationPlan);
  if (!modules.length) return <section className="architecture-panel architecture-placeholder"><p className="section-kicker">ARCHITECTURE</p><h2>Your generated design map will appear here</h2><p>Generate a hardware project to see its AI-planned modules, signal connections, and verification plan.</p></section>;

  return <section className="architecture-panel"><header><div><p className="section-kicker">ARCHITECTURE</p><h2>{text(architecture.designName, "Generated design")}</h2><p>{text(architecture.summary, "Module plan generated from your prompt.")}</p></div><span>{modules.length} modules</span></header><div className="architecture-graph">{modules.map((module, index) => <article key={`${text(module.name, "module")}-${index}`}><b>M{String(index + 1).padStart(2, "0")}</b><h3>{text(module.name, `module_${index + 1}`)}</h3><p>{text(module.purpose, "No purpose was provided.")}</p><div><small>INPUTS</small>{list(values(module.inputs), "No declared inputs")}</div><div><small>OUTPUTS</small>{list(values(module.outputs), "No declared outputs")}</div></article>)}</div><section className="architecture-connections"><h3>Signal map</h3>{connections.length ? <ul>{connections.map((connection, index) => <li key={`${text(connection.from, "source")}-${text(connection.to, "target")}-${index}`}><b>{text(connection.from, "source")}</b><i>→</i><span>{text(connection.signal, "signal")}</span><i>→</i><b>{text(connection.to, "target")}</b></li>)}</ul> : <p>No inter-module signals were required for this design.</p>}</section><section className="architecture-verification"><h3>Verification plan</h3><ol>{verificationPlan.map((item) => <li key={item}>{item}</li>)}</ol></section></section>;
}
