import { Background, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, type Connection, type Edge, type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo } from "react";
import { compileSchematic, type CircuitGraph, type CircuitNode, type CircuitNodeKind, type CompileResult } from "./netlistCompiler";
import { useDesignerStore } from "./designerStore";
import { useHardwareStore } from "../../store/hardwareStore";

const palette: Array<{ label: string; items: CircuitNodeKind[] }> = [
  { label: "Logic gates", items: ["and", "or", "not", "nand", "nor", "xor", "xnor"] },
  { label: "Sequential", items: ["dff", "register", "counter"] },
  { label: "Datapath", items: ["mux", "adder", "alu"] },
  { label: "I/O pins", items: ["input", "output", "clock", "reset", "custom"] },
];
const icons: Partial<Record<CircuitNodeKind, string>> = { and: "&", or: "≥1", not: "1", nand: "⊼", nor: "⊽", xor: "⊻", xnor: "⊙", mux: "MUX", adder: "+", alu: "ALU", dff: "D", register: "REG", counter: "CNT", input: "IN", output: "OUT", clock: "CLK", reset: "RST", custom: "{}" };

function GateNode({ data, selected }: NodeProps<Node<CircuitNode>>) {
  const node = data as CircuitNode;
  const isInput = ["input", "clock", "reset"].includes(node.type);
  const isOutput = node.type === "output";
  return <motion.div initial={{ opacity: 0, scale: .82 }} animate={{ opacity: 1, scale: 1 }} className={`designer-node ${selected ? "designer-node-selected" : ""} ${isInput ? "designer-node-io" : ""}`}>
    {!isInput && <Handle type="target" position={Position.Left} id="in-a" aria-label="Input port" />}
    <div className="designer-node-icon">{icons[node.type] ?? "{}"}</div><div><strong>{node.label}</strong><span>{node.type.replaceAll("_", " ")}</span></div>
    <b>{node.width}b</b>
    {!isOutput && <Handle type="source" position={Position.Right} id="out" aria-label="Output port" />}
  </motion.div>;
}
const nodeTypes = { circuit: GateNode };

function DesignerCanvas({ onGenerated }: { onGenerated: (result: CompileResult, graph: CircuitGraph) => void }) {
  const nodes = useDesignerStore((state) => state.nodes);
  const edges = useDesignerStore((state) => state.edges);
  const selectedNodeId = useDesignerStore((state) => state.selectedNodeId);
  const addNode = useDesignerStore((state) => state.addNode);
  const addEdge = useDesignerStore((state) => state.addEdge);
  const selectNode = useDesignerStore((state) => state.selectNode);
  const updateNode = useDesignerStore((state) => state.updateNode);
  const deleteSelected = useDesignerStore((state) => state.deleteSelected);
  const duplicateSelected = useDesignerStore((state) => state.duplicateSelected);
  const undo = useDesignerStore((state) => state.undo);
  const redo = useDesignerStore((state) => state.redo);
  const warnings = useDesignerStore((state) => state.warnings);
  const setVerilogCode = useHardwareStore((state) => state.setVerilogCode);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const selected = nodes.find((node) => node.id === selectedNodeId);
  const rfNodes: Node[] = useMemo(() => nodes.map((node) => ({ id: node.id, type: "circuit", position: node.position, data: node, selected: node.id === selectedNodeId })), [nodes, selectedNodeId]);
  const rfEdges: Edge[] = useMemo(() => edges.map((edge) => ({ ...edge, animated: true, style: { stroke: "#38bdf8", strokeWidth: 2 } })), [edges]);

  const onConnect = useCallback((connection: Connection) => { if (connection.source && connection.target) addEdge({ source: connection.source, target: connection.target, sourceHandle: connection.sourceHandle, targetHandle: connection.targetHandle, id: "" }); }, [addEdge]);
  const onDrop = useCallback((event: React.DragEvent) => { event.preventDefault(); const type = event.dataTransfer.getData("application/silicon-node") as CircuitNodeKind; if (type) addNode(type, screenToFlowPosition({ x: event.clientX, y: event.clientY })); }, [addNode, screenToFlowPosition]);
  const compile = () => {
    const graph = { nodes, edges };
    const result = compileSchematic(graph);
    setVerilogCode(result.verilog);
    selectNode(null);
    onGenerated(result, graph);
  };
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "Delete" || event.key === "Backspace") deleteSelected(); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelected(); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [deleteSelected, duplicateSelected, redo, undo]);
  return <div className="designer-layout">
    <aside className="designer-palette"><div className="section-kicker">COMPONENT LIBRARY</div>{palette.map((group) => <section key={group.label}><h3>{group.label}</h3>{group.items.map((kind) => <button draggable key={kind} onDragStart={(event) => event.dataTransfer.setData("application/silicon-node", kind)} onClick={() => addNode(kind, { x: 250, y: 180 })}><span>{icons[kind]}</span>{kind.replaceAll("_", " ")}</button>)}</section>)}</aside>
    <section className="designer-surface" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <div className="designer-toolbar"><div><button onClick={undo}>↶ Undo</button><button onClick={redo}>↷ Redo</button><button onClick={duplicateSelected} disabled={!selected}>Duplicate</button><button onClick={deleteSelected} disabled={!selected}>Delete</button></div><div><button onClick={() => fitView({ padding: .2 })}>Fit view</button><button className="button-primary" onClick={compile}>Generate RTL</button></div></div>
      <ReactFlow nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} onConnect={onConnect} onNodeClick={(_, node) => selectNode(node.id)} onPaneClick={() => selectNode(null)} onNodesChange={(changes) => changes.forEach((change) => { if (change.type === "position" && change.position) updateNode(change.id, { position: change.position }); })} fitView snapToGrid snapGrid={[16, 16]} deleteKeyCode={null} multiSelectionKeyCode="Shift"><Background color="#20314d" gap={16} size={1} /><MiniMap pannable zoomable nodeColor="#0ea5e9" /><Controls showInteractive={false} /></ReactFlow>
      {warnings.length > 0 && <motion.p initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="designer-warning">⚠ {warnings[0]}</motion.p>}
    </section>
    <aside className="designer-inspector"><div className="section-kicker">INSPECTOR</div>{selected ? <><h2>{selected.label}</h2><label>Instance name<input value={selected.label} onChange={(event) => updateNode(selected.id, { label: event.target.value })} /></label><label>Bus width<select value={selected.width} onChange={(event) => updateNode(selected.id, { width: Number(event.target.value) })}><option value={1}>1 bit</option><option value={4}>4 bits</option><option value={8}>8 bits</option><option value={16}>16 bits</option><option value={32}>32 bits</option></select></label><p>Drag a compatible source handle to an input handle. The designer blocks output-to-output links, bus-width mismatches, and combinational loops.</p></> : <div className="empty-inspector"><span>⌁</span><h2>Select a block</h2><p>Configure its instance name, bus width, and parameters here.</p></div>}</aside>
  </div>;
}

export function CircuitDesigner({ onGenerated }: { onGenerated: (result: CompileResult, graph: CircuitGraph) => void }) { return <ReactFlowProvider><DesignerCanvas onGenerated={onGenerated} /></ReactFlowProvider>; }
