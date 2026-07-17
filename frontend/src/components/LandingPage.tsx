import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useHardwareStore } from "../store/hardwareStore";

const suggestions = [
  "4-bit ALU with overflow",
  "16-entry Synchronous FIFO",
  "5-stage RISC-V CPU",
];

function ArchitectureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden="true">
      <rect x="3.5" y="4" width="6" height="5" rx="1" />
      <rect x="14.5" y="4" width="6" height="5" rx="1" />
      <rect x="9" y="15" width="6" height="5" rx="1" />
      <path d="M6.5 9v2.5h11V9M12 11.5V15" />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden="true">
      <path d="M3 12h3l2.25-5 3.5 10L14 12h2l1.75-4 1.5 4H21" />
      <path d="M3 4v16h18" opacity="0.55" />
    </svg>
  );
}

function DebugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden="true">
      <path d="M12 3.5 5.5 6v5.75c0 4.25 2.7 7.55 6.5 8.75 3.8-1.2 6.5-4.5 6.5-8.75V6L12 3.5Z" />
      <path d="m8.75 12 2.1 2.1 4.4-4.4" />
    </svg>
  );
}

const features = [
  {
    tag: "01 Architect",
    title: "Two-Agent System",
    description: "GPT-5.6 reasons the microarchitecture and defines the logic. Codex takes the spec and autonomously writes the synthesizable Verilog.",
    Icon: ArchitectureIcon,
  },
  {
    tag: "02 Visualize",
    title: "Interactive RTL & Waveforms",
    description: "Auto-generates a React Flow block diagram synced to your code, plus cycle-accurate waveforms rendered instantly in your browser.",
    Icon: WaveformIcon,
  },
  {
    tag: "03 Auto-Fix",
    title: "Agentic Debugging",
    description: "Simulation failed? One click packages the failing state, sends it to Codex to rewrite the logic, and re-runs the test automatically.",
    Icon: DebugIcon,
  },
];

const footerColumns = [
  { title: "Product", links: ["Workspace", "Simulation", "Architecture"] },
  { title: "Resources", links: ["Documentation", "Examples", "Release notes"] },
  { title: "Company", links: ["About", "Security", "Contact"] },
];

function LandingPage() {
  const prompt = useHardwareStore((state) => state.prompt);
  const setPrompt = useHardwareStore((state) => state.setPrompt);
  const navigate = useNavigate();

  const startWorkspace = (nextPrompt: string) => {
    setPrompt(nextPrompt.trim());
    navigate("/workspace");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startWorkspace(prompt);
  };

  return (
    <main className="min-h-screen bg-[#0b1220] text-slate-200">
      <nav className="fixed inset-x-0 top-0 z-10 h-16 border-b border-slate-700/60 bg-[#0b1220] px-6 lg:px-10">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-[-0.02em] text-white">
            <span className="grid h-6 w-6 place-items-center border border-blue-400/60 bg-blue-500/15 text-blue-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
                <path d="M5 5h14v14H5zM8 8h3v3H8zM13 13h3v3h-3zM11 9.5h2M9.5 11v2M14.5 13v-2" />
              </svg>
            </span>
            Silicon Canvas
          </a>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
              <a href="#product" className="transition-colors hover:text-white">Product</a>
              <a href="#resources" className="transition-colors hover:text-white">Docs</a>
              <a href="#examples" className="transition-colors hover:text-white">Examples</a>
            </div>
            <button
              type="button"
              onClick={() => startWorkspace(prompt)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]"
            >
              Open workspace
            </button>
          </div>
        </div>
      </nav>

      <section id="top" className="mx-auto w-full max-w-7xl px-6 pb-16 pt-28 lg:px-10 lg:pt-36">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div>
            <p className="text-sm font-medium text-blue-300">Hardware design platform</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              From concept to silicon, with engineering discipline.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
              Silicon Canvas translates plain English into synthesizable Verilog, interactive block diagrams, and cycle-accurate waveforms. Design, simulate, and debug RTL entirely in your browser.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-slate-400">
              <span className="h-px w-8 bg-slate-700" />
              Architecture, RTL, and simulation in one workspace
            </div>
          </div>

          <div className="overflow-hidden border border-slate-700/70 bg-[#111827]">
            <div className="flex h-10 items-center justify-between border-b border-slate-700/70 bg-[#0f172a] px-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 bg-blue-400" />
                DESIGN WORKSPACE
              </div>
              <span className="font-mono text-xs text-slate-500">design.v</span>
            </div>
            <div className="grid min-h-[280px] grid-cols-[0.9fr_1.1fr]">
              <div className="relative border-r border-slate-700/70 bg-[#0f172a] p-5">
                <p className="font-mono text-xs text-slate-500">ARCHITECTURE</p>
                <div className="absolute left-8 top-16 border border-blue-400/50 bg-[#17233a] px-3 py-2 text-xs text-slate-200">Input</div>
                <div className="absolute left-16 top-32 border border-slate-600 bg-[#172033] px-3 py-2 text-xs text-slate-200">ALU Core</div>
                <div className="absolute bottom-10 right-6 border border-slate-600 bg-[#172033] px-3 py-2 text-xs text-slate-200">Flags</div>
                <svg viewBox="0 0 180 220" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
                  <path d="M74 83v25m0 0 38 0m-38 0 0 34m38-34v55" stroke="#49617f" strokeWidth="1" />
                  <circle cx="74" cy="108" r="2.5" fill="#60a5fa" />
                </svg>
              </div>
              <div className="p-5 font-mono text-xs leading-6">
                <p><span className="text-blue-300">module</span> <span className="text-slate-100">alu</span> <span className="text-slate-500">(</span></p>
                <p className="pl-3 text-slate-400">input logic [3:0] a, b,</p>
                <p className="pl-3 text-slate-400">input logic [1:0] op,</p>
                <p className="pl-3 text-slate-400">output logic [3:0] y</p>
                <p><span className="text-slate-500">);</span></p>
                <p className="mt-3"><span className="text-blue-300">always_comb</span> <span className="text-slate-500">begin</span></p>
                <p className="pl-3 text-slate-300">case (op)</p>
                <p className="pl-6 text-slate-400">2'b00: y = a + b;</p>
                <p className="pl-6 text-slate-400">2'b01: y = a - b;</p>
                <p className="pl-3 text-slate-300">endcase</p>
                <p><span className="text-slate-500">end</span></p>
              </div>
            </div>
            <div className="flex h-10 items-center gap-5 border-t border-slate-700/70 px-4 font-mono text-xs text-slate-500">
              <span className="text-blue-300">Simulation ready</span>
              <span>0 errors</span>
              <span>0.00 ns</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-16 w-full border border-slate-700/70 bg-[#111827] p-2">
          <div className="flex items-center gap-2">
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="e.g. A 4-bit ALU with overflow detection"
              aria-label="Describe the hardware to generate"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Generate design
            </button>
          </div>
        </form>

        <div id="examples" className="mt-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Start with an example</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => startWorkspace(suggestion)}
                className="cursor-pointer border border-slate-700/70 bg-[#111827] px-3 py-2 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div id="product" className="mt-16 border-t border-slate-700/60 pt-12">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-blue-300">Built for the complete RTL loop</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white">A connected design environment.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-400">From intent to verified logic, every view is kept in sync.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.Icon;

              return (
                <article key={feature.tag} className="flex min-h-[224px] flex-col border border-slate-700/70 bg-[#0f172a] p-6">
                  <span className="grid h-10 w-10 place-items-center border border-slate-600 bg-[#111827] text-blue-300">
                    <Icon />
                  </span>
                  <p className="mt-6 font-mono text-sm text-blue-300">{feature.tag}</p>
                  <h3 className="mt-2 font-medium text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer id="resources" className="border-t border-slate-700/60 bg-[#0f172a] px-6 py-12 lg:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <p className="font-semibold tracking-[-0.02em] text-white">Silicon Canvas</p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">A focused design workspace for modern hardware teams.</p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-medium text-slate-200">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#top" className="text-sm text-slate-400 transition-colors hover:text-white">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}

export default LandingPage;
