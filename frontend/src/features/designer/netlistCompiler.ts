export type CircuitNodeKind = "input" | "output" | "clock" | "reset" | "and" | "or" | "not" | "nand" | "nor" | "xor" | "xnor" | "mux" | "adder" | "dff" | "register" | "counter" | "alu" | "custom";

export type CircuitNode = {
  id: string;
  type: CircuitNodeKind;
  label: string;
  width: number;
  position: { x: number; y: number };
  parameters?: Record<string, string | number>;
};

export type CircuitEdge = { id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null };
export type CircuitGraph = { nodes: CircuitNode[]; edges: CircuitEdge[] };
export type CompileResult = { verilog: string; sourceMap: Record<string, [number, number]>; warnings: string[] };

const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^[^a-z_]/, "n_") || "node";
const bus = (width: number) => width > 1 ? `[${width - 1}:0] ` : "";

export function hasCombinationalLoop(graph: CircuitGraph, source: string, target: string) {
  const combinational = new Set(graph.nodes.filter((node) => !["dff", "register", "counter", "clock", "reset"].includes(node.type)).map((node) => node.id));
  if (!combinational.has(source) || !combinational.has(target)) return false;
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
  const visit = (id: string, seen = new Set<string>()): boolean => {
    if (id === source) return true;
    if (seen.has(id) || !combinational.has(id)) return false;
    seen.add(id);
    return (adjacency.get(id) ?? []).some((next) => visit(next, seen));
  };
  return visit(target);
}

export function compileSchematic(graph: CircuitGraph): CompileResult {
  const inputs = graph.nodes.filter((node) => ["input", "clock", "reset"].includes(node.type));
  const outputs = graph.nodes.filter((node) => node.type === "output");
  const internal = graph.nodes.filter((node) => !["input", "clock", "reset", "output"].includes(node.type));
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, CircuitEdge[]>();
  for (const edge of graph.edges) incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
  const net = (id: string) => `n_${sanitize(byId.get(id)?.label ?? id)}`;
  const lines: string[] = [];
  const sourceMap: Record<string, [number, number]> = {};
  const warnings: string[] = [];

  lines.push("// Generated deterministically by Silicon Canvas Circuit Designer.");
  lines.push("module schematic_top(");
  const ports = [...inputs, ...outputs].map((node) => `  ${node.type === "output" ? "output" : "input"} wire ${bus(node.width)}${sanitize(node.label)}`);
  lines.push(ports.join(",\n"));
  lines.push(");", "");
  for (const node of internal) lines.push(`  wire ${bus(node.width)}${net(node.id)};`);
  if (internal.length) lines.push("");

  const signal = (edge?: CircuitEdge) => edge ? (byId.get(edge.source)?.type === "output" ? net(edge.source) : sanitize(byId.get(edge.source)?.label ?? edge.source)) : "1'b0";
  for (const node of internal) {
    const begin = lines.length + 1;
    const args = incoming.get(node.id) ?? [];
    const a = signal(args[0]);
    const b = signal(args[1]);
    const out = net(node.id);
    const instance = sanitize(node.label);
    if (node.type === "not") lines.push(`  not ${instance} (${out}, ${a});`);
    else if (["and", "or", "nand", "nor", "xor", "xnor"].includes(node.type)) lines.push(`  ${node.type} ${instance} (${out}, ${a}, ${b});`);
    else if (node.type === "adder") lines.push(`  assign ${out} = ${a} + ${b};`);
    else if (node.type === "mux") lines.push(`  assign ${out} = ${args[2] ? signal(args[2]) : "1'b0"} ? ${b} : ${a};`);
    else if (node.type === "dff" || node.type === "register") lines.push(`  always @(posedge ${a}) ${out} <= ${b};`);
    else if (node.type === "counter") lines.push(`  always @(posedge ${a}) ${out} <= ${out} + 1'b1;`);
    else if (node.type === "alu") lines.push(`  assign ${out} = ${a} + ${b}; // ALU starter operation`);
    else lines.push(`  // ${instance}: custom module placeholder`);
    sourceMap[node.id] = [begin, lines.length];
  }
  for (const node of outputs) {
    const edge = (incoming.get(node.id) ?? [])[0];
    if (!edge) warnings.push(`Output “${node.label}” is not connected.`);
    lines.push(`  assign ${sanitize(node.label)} = ${signal(edge)};`);
  }
  if (!inputs.length) warnings.push("Add at least one input pin before compiling.");
  if (!outputs.length) warnings.push("Add at least one output pin before compiling.");
  lines.push("endmodule");
  return { verilog: lines.join("\n") + "\n", sourceMap, warnings };
}
