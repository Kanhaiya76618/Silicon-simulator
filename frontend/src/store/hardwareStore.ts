import { create } from "zustand";
import type { DesignFile, Project, SimulationRun } from "@silicon-canvas/shared/contracts";

export interface HardwareDesignState {
  prompt: string;
  verilogCode: string;
  isGenerating: boolean;
  graphData: Record<string, unknown>;
  simulationData: SimulationRun[];
  project: Project | null;
  files: DesignFile[];
  generationError: string | null;
}

export interface HardwareDesignActions {
  setPrompt: (prompt: string) => void;
  setVerilogCode: (verilogCode: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGraphData: (graphData: Record<string, unknown>) => void;
  setSimulationData: (simulationData: SimulationRun[]) => void;
  setProject: (project: Project | null) => void;
  setFiles: (files: DesignFile[]) => void;
  setGenerationError: (generationError: string | null) => void;
}

export interface HardwareStore extends HardwareDesignState, HardwareDesignActions {}

export const useHardwareStore = create<HardwareStore>((set) => ({
  prompt: "",
  setPrompt: (prompt) => set({ prompt }),
  verilogCode: "// Generated Verilog will appear here",
  setVerilogCode: (verilogCode) => set({ verilogCode }),
  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  graphData: {},
  setGraphData: (graphData) => set({ graphData }),
  simulationData: [],
  setSimulationData: (simulationData) => set({ simulationData }),
  project: null,
  setProject: (project) => set({ project }),
  files: [],
  setFiles: (files) => set({ files }),
  generationError: null,
  setGenerationError: (generationError) => set({ generationError }),
}));
