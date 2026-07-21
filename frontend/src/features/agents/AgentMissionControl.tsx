import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const agents = [
  { name: "Architect", initials: "AR", detail: "Plans modules, ports, and the block diagram.", output: "Architecture specification", color: "blue" },
  { name: "RTL Engineer", initials: "RT", detail: "Writes synthesizable Verilog and a self-checking testbench.", output: "RTL and testbench", color: "cyan" },
  { name: "Verification", initials: "VE", detail: "Runs assertions and turns results into waveform evidence.", output: "Simulation result", color: "violet" },
  { name: "Debug Agent", initials: "DB", detail: "Diagnoses a failed simulation and proposes a versioned repair.", output: "Patch proposal", color: "amber" },
  { name: "Mentor", initials: "ME", detail: "Explains modules, signals, and design decisions in plain language.", output: "Guided explanation", color: "teal" },
];

export function AgentMissionControl({ prompt }: { prompt: string }) {
  const [open, setOpen] = useState<string | null>("Architect");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; text: string }>>([{ role: "agent", text: "I’m the Mentor. Select a module or ask how the current design works." }]);
  const ask = () => { if (!message.trim()) return; setMessages((current) => [...current, { role: "user", text: message }, { role: "agent", text: "AI Mentor is ready to explain this design when a server-side model is configured. The deterministic Circuit Designer remains fully available without credentials." }]); setMessage(""); };
  return <section className="mission-control"><div className="mission-heading"><div><p className="section-kicker">AGENT MISSION CONTROL</p><h2>One design, five specialists.</h2></div><span className="agent-status"><i /> Deterministic mode</span></div><div className="agent-roster">{agents.map((agent, index) => <motion.button layout key={agent.name} className={`agent-card ${open === agent.name ? "agent-card-open" : ""}`} onClick={() => setOpen(open === agent.name ? null : agent.name)} whileHover={{ y: -3 }} whileTap={{ scale: .98 }}><span className={`agent-avatar ${agent.color}`}>{agent.initials}</span><div><strong>{agent.name}</strong><small>{index < 3 ? "Ready" : "Standby"}</small></div><b>⌄</b><AnimatePresence>{open === agent.name && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{agent.detail}<em>Produces: {agent.output}</em></motion.p>}</AnimatePresence></motion.button>)}</div><div className="agent-timeline">{["Prompt received", "Architect maps blocks", "RTL Engineer prepares source", "Verifier waits for run"].map((step, index) => <div key={step} className={index === 1 ? "timeline-active" : ""}><i>{index + 1}</i><span>{step}</span></div>)}</div><div className="mentor-chat"><div><b>Mentor / Explainer</b><span>Server-side AI not configured</span></div><div className="chat-log">{messages.map((item, index) => <p key={index} className={item.role}>{item.text}</p>)}</div><form onSubmit={(event) => { event.preventDefault(); ask(); }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={prompt ? `Ask about “${prompt.slice(0, 36)}…”` : "Explain this module"} /><button className="button-primary">Ask</button></form></div></section>;
}
