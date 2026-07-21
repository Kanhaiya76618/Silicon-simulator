import { motion } from "framer-motion";
import { useState } from "react";
import type { Project } from "@silicon-canvas/shared/contracts";
import { askMentor, createProject } from "../../api/client";

const agents = [
  { name: "Architect", initials: "AR", detail: "Plans modules, ports, and the block diagram.", output: "Architecture specification", color: "blue" },
  { name: "RTL Engineer", initials: "RT", detail: "Writes synthesizable Verilog and a self-checking testbench.", output: "RTL and testbench", color: "cyan" },
  { name: "Verification", initials: "VE", detail: "Runs assertions and turns results into waveform evidence.", output: "Simulation result", color: "violet" },
  { name: "Debug Agent", initials: "DB", detail: "Diagnoses a failed simulation and proposes a versioned repair.", output: "Patch proposal", color: "amber" },
  { name: "Mentor", initials: "ME", detail: "Explains modules, signals, and design decisions in plain language.", output: "Guided explanation", color: "teal" },
];

export function AgentMissionControl({ prompt, projectId, onProjectCreated }: { prompt: string; projectId?: string; onProjectCreated?: (project: Project) => void }) {
  const [open, setOpen] = useState<string | null>("Architect");
  const [message, setMessage] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; text: string }>>([
    { role: "agent", text: "I’m the Mentor. Select a module or ask how the current design works." },
  ]);

  const ask = async () => {
    const question = message.trim();
    if (!question || isAsking) return;
    setMessages((current) => [...current, { role: "user", text: question }]);
    setMessage("");
    setIsAsking(true);
    try {
      const contextProject = projectId ? undefined : await createProject(prompt.trim() || "Hardware design discussion");
      if (contextProject) onProjectCreated?.(contextProject);
      const answer = await askMentor(contextProject?.id ?? projectId!, question);
      setMessages((current) => [...current, { role: "agent", text: answer }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "agent", text: `I could not reach the server-side Mentor: ${error instanceof Error ? error.message : "Unknown error."}` }]);
    } finally {
      setIsAsking(false);
    }
  };

  return <section className="mission-control">
    <div className="mission-heading"><div><p className="section-kicker">AGENT MISSION CONTROL</p><h2>One design, five specialists.</h2></div><span className="agent-status"><i /> {projectId ? "Project context ready" : "Ready to start"}</span></div>
    <div className="agent-roster">{agents.map((agent, index) => <motion.button layout key={agent.name} className={`agent-card ${open === agent.name ? "agent-card-open" : ""}`} onClick={() => setOpen(open === agent.name ? null : agent.name)} whileHover={{ y: -3 }} whileTap={{ scale: .98}}><span className={`agent-avatar ${agent.color}`}>{agent.initials}</span><span><strong>{agent.name}</strong><small>{index < 3 ? "Ready" : "Standby"}</small></span><b>⌄</b>{open === agent.name && <span className="agent-card-detail">{agent.detail}<span className="agent-card-output">Produces: {agent.output}</span></span>}</motion.button>)}</div>
    <div className="mentor-chat"><div><b>Mentor / Explainer</b><span>{projectId ? "Server-side AI" : "Creates project context"}</span></div><div className="chat-log">{messages.map((item, index) => <p key={index} className={item.role}>{item.text}</p>)}</div><form onSubmit={(event) => { event.preventDefault(); void ask(); }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={prompt ? `Ask about “${prompt.slice(0, 36)}…”` : "Explain this module"} disabled={isAsking} /><button className="button-primary" disabled={isAsking}>{isAsking ? "Thinking…" : "Ask"}</button></form></div>
  </section>;
}
