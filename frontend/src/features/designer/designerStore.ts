import { create } from "zustand";
import type { CircuitEdge, CircuitGraph, CircuitNode, CircuitNodeKind } from "./netlistCompiler";
import { hasCombinationalLoop } from "./netlistCompiler";

type Snapshot = CircuitGraph;
type DesignerState = CircuitGraph & {
  selectedNodeId: string | null;
  history: Snapshot[];
  future: Snapshot[];
  warnings: string[];
  selectNode: (id: string | null) => void;
  addNode: (type: CircuitNodeKind, position: { x: number; y: number }) => void;
  updateNode: (id: string, patch: Partial<CircuitNode>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  addEdge: (edge: CircuitEdge) => boolean;
  undo: () => void;
  redo: () => void;
};

const labels: Record<CircuitNodeKind, string> = { input: "Input", output: "Output", clock: "Clock", reset: "Reset", and: "AND Gate", or: "OR Gate", not: "NOT Gate", nand: "NAND Gate", nor: "NOR Gate", xor: "XOR Gate", xnor: "XNOR Gate", mux: "MUX", adder: "Adder", dff: "D Flip-Flop", register: "Register", counter: "Counter", alu: "ALU", custom: "Custom Module" };
const initial: CircuitGraph = { nodes: [{ id: "in-a", type: "input", label: "a", width: 1, position: { x: 48, y: 120 } }, { id: "in-b", type: "input", label: "b", width: 1, position: { x: 48, y: 260 } }, { id: "xor-1", type: "xor", label: "xor_1", width: 1, position: { x: 330, y: 180 } }, { id: "out-y", type: "output", label: "y", width: 1, position: { x: 650, y: 180 } }], edges: [{ id: "a-xor", source: "in-a", target: "xor-1" }, { id: "b-xor", source: "in-b", target: "xor-1" }, { id: "xor-y", source: "xor-1", target: "out-y" }] };
const snapshot = (state: CircuitGraph): Snapshot => ({ nodes: structuredClone(state.nodes), edges: structuredClone(state.edges) });

export const useDesignerStore = create<DesignerState>((set, get) => ({
  ...initial, selectedNodeId: null, history: [], future: [], warnings: [],
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
  addNode: (type, position) => set((state) => { const before = snapshot(state); const id = crypto.randomUUID(); return { history: [...state.history, before], future: [], nodes: [...state.nodes, { id, type, label: `${labels[type].toLowerCase().replaceAll(" ", "_")}_${state.nodes.length + 1}`, width: ["adder", "alu", "register", "counter"].includes(type) ? 8 : 1, position }], selectedNodeId: id }; }),
  updateNode: (id, patch) => set((state) => ({ history: [...state.history, snapshot(state)], future: [], nodes: state.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) })),
  deleteSelected: () => set((state) => { if (!state.selectedNodeId) return state; return { history: [...state.history, snapshot(state)], future: [], nodes: state.nodes.filter((node) => node.id !== state.selectedNodeId), edges: state.edges.filter((edge) => edge.source !== state.selectedNodeId && edge.target !== state.selectedNodeId), selectedNodeId: null }; }),
  duplicateSelected: () => set((state) => { const current = state.nodes.find((node) => node.id === state.selectedNodeId); if (!current) return state; const id = crypto.randomUUID(); return { history: [...state.history, snapshot(state)], future: [], nodes: [...state.nodes, { ...current, id, label: `${current.label}_copy`, position: { x: current.position.x + 44, y: current.position.y + 44 } }], selectedNodeId: id }; }),
  addEdge: (edge) => { const state = get(); const source = state.nodes.find((node) => node.id === edge.source); const target = state.nodes.find((node) => node.id === edge.target); if (!source || !target || source.type === "output" || target.type === "input" || source.width !== target.width || hasCombinationalLoop({ nodes: state.nodes, edges: state.edges }, edge.source, edge.target)) { set({ warnings: ["Connection rejected: use output → input, match bus widths, and avoid combinational loops."] }); return false; } set({ history: [...state.history, snapshot(state)], future: [], edges: [...state.edges, { ...edge, id: crypto.randomUUID() }], warnings: [] }); return true; },
  undo: () => set((state) => { const previous = state.history.at(-1); if (!previous) return state; return { ...previous, history: state.history.slice(0, -1), future: [snapshot(state), ...state.future] }; }),
  redo: () => set((state) => { const next = state.future[0]; if (!next) return state; return { ...next, history: [...state.history, snapshot(state)], future: state.future.slice(1) }; }),
}));
