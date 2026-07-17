import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useHardwareStore } from "../store/hardwareStore";

const suggestions = [
  "A 4-bit ALU with overflow detection",
  "A synchronous FIFO with 16 entries",
  "A 5-stage pipelined RISC-V CPU",
  "An I2C master controller",
];

const features = [
  {
    number: "01",
    title: "Reason",
    description: "Two AI passes: architect first, code second.",
  },
  {
    number: "02",
    title: "Simulate",
    description: "Cycle-accurate waveforms, straight in the browser.",
  },
  {
    number: "03",
    title: "Fix",
    description: "Failed assertion? One click patches the RTL.",
  },
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
    <main className="min-h-screen overflow-y-auto bg-[#0a0a0a] px-6 py-16 text-white sm:py-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <p className="mb-7 rounded-full border border-red-600 bg-[#141414] px-4 py-1.5 text-xs font-semibold tracking-[0.16em] text-red-400">
          HARDWARE DESIGN, REIMAGINED
        </p>

        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Describe hardware the way you&apos;d explain it to a friend.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-gray-400 sm:text-lg">
          Transform plain English prompts into synthesizable Verilog, interactive block diagrams, and timing-accurate waveforms. Fix simulation issues using natural language.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 w-full max-w-3xl">
          <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-[#141414] p-2 focus-within:border-red-500">
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="e.g. a 4-bit ALU with overflow detection"
              aria-label="Describe the hardware to generate"
              className="min-w-0 flex-1 bg-[#141414] px-3 py-3 text-sm text-white outline-none placeholder:text-gray-500 sm:text-base"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400 focus-visible:outline-offset-2"
            >
              Generate
            </button>
          </div>
        </form>

        <div className="mt-6 w-full max-w-3xl">
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-gray-500">TRY ONE OF THESE:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => startWorkspace(suggestion)}
                className="rounded-full border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-gray-300 hover:border-gray-600 hover:bg-[#222222]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-16 grid w-full gap-4 text-left md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-xl border border-gray-800 bg-[#141414] p-6">
              <h2 className="text-lg font-semibold text-white">
                <span className="mr-3 font-mono text-red-500">{feature.number}</span>
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default LandingPage;
