import { motion, useReducedMotion } from "framer-motion";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useHardwareStore } from "../store/hardwareStore";

const suggestions = ["A 4-bit ALU with overflow detection", "A synchronous FIFO with 16 entries", "A 5-stage pipelined RISC-V CPU", "An I2C master controller"];
const steps = [["01", "Architect", "Maps modules, ports, and constraints."], ["02", "Engineer", "Turns the design into readable RTL."], ["03", "Verifier", "Tests the hardware and explains the result."]];

function LandingPage() {
  const prompt = useHardwareStore((state) => state.prompt);
  const setPrompt = useHardwareStore((state) => state.setPrompt);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const enterWorkspace = (nextPrompt: string) => { setPrompt(nextPrompt.trim()); navigate("/workspace"); };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); enterWorkspace(prompt); };
  const rise = reduceMotion ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 } };
  return <main className="landing"><div className="circuit-orbit orbit-one" /><div className="circuit-orbit orbit-two" /><header className="landing-nav"><a href="/" className="brand"><span>SC</span> Silicon Canvas</a><a href="#how-it-works">How it works</a><button onClick={() => enterWorkspace(prompt || suggestions[0])}>Open workspace →</button></header><section className="hero"><motion.p {...rise} transition={{ duration: .42 }} className="hero-badge"><i /> AGENTIC HARDWARE STUDIO</motion.p><motion.h1 {...rise} transition={{ delay: .08, duration: .55 }}>From an idea to<br /><em>live silicon logic.</em></motion.h1><motion.p {...rise} transition={{ delay: .16, duration: .45 }} className="hero-copy">Describe the hardware you want. Silicon Canvas gives you an editable schematic, understandable Verilog, visual proof, and an expert AI team to help you improve it.</motion.p><motion.form {...rise} transition={{ delay: .24, duration: .45 }} onSubmit={submit} className="hero-prompt"><span>✦</span><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe a circuit to build…" aria-label="Describe hardware to generate" /><button className="button-primary">Start designing <b>↗</b></button></motion.form><motion.div {...rise} transition={{ delay: .32, duration: .45 }} className="suggestion-row"><span>Try an example</span>{suggestions.map((suggestion) => <button key={suggestion} onClick={() => enterWorkspace(suggestion)}>{suggestion}</button>)}</motion.div></section><motion.section {...rise} transition={{ delay: .42, duration: .5 }} id="how-it-works" className="landing-process"><div className="process-head"><p className="section-kicker">HARDWARE, WITHOUT THE CLI</p><h2>A visible engineering loop.</h2></div>{steps.map(([number, title, description]) => <article key={title}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><i>↗</i></article>)}</motion.section><section className="landing-footer"><span>Deterministic circuit compiler</span><span>•</span><span>Visual VCD evidence</span><span>•</span><span>Version-safe AI repairs</span></section></main>;
}

export default LandingPage;
