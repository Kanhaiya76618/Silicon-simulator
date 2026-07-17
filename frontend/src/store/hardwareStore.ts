import { create } from "zustand";

export interface HardwareDesignState {
  prompt: string;
  verilogCode: string;
  isGenerating: boolean;
  graphData: Record<string, unknown>;
  simulationData: unknown[];
}

export interface HardwareDesignActions {
  setPrompt: (prompt: string) => void;
  setVerilogCode: (verilogCode: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGraphData: (graphData: Record<string, unknown>) => void;
  setSimulationData: (simulationData: unknown[]) => void;
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
}));
