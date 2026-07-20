export type LogicValue = "0" | "1" | "x" | "z" | string;

export interface VcdSignal {
  id: string;
  name: string;
  width: number;
}

export interface VcdChange {
  time: number;
  value: LogicValue;
}

export interface ParsedVcd {
  timescale: string | null;
  signals: VcdSignal[];
  changesBySignalId: Record<string, VcdChange[]>;
  endTime: number;
}

export interface WaveformSegment {
  from: number;
  to: number;
  value: LogicValue;
}

function normalizeValue(value: string): LogicValue {
  const normalized = value.toLowerCase();
  if (normalized === "0" || normalized === "1" || normalized === "x" || normalized === "z") return normalized;
  return value;
}

/** Parse the VCD subset emitted by Verilator and most standard HDL simulators. */
export function parseVcd(vcd: string): ParsedVcd {
  const signals: VcdSignal[] = [];
  const changesBySignalId: Record<string, VcdChange[]> = {};
  const scope: string[] = [];
  let timescale: string | null = null;
  let currentTime = 0;
  let endTime = 0;
  let inDefinitions = true;
  const lines = vcd.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    if (line.startsWith("$scope")) {
      const [, , name] = line.split(/\s+/);
      if (name) scope.push(name);
      continue;
    }
    if (line.startsWith("$upscope")) {
      scope.pop();
      continue;
    }
    if (line.startsWith("$timescale")) {
      const inline = line.replace(/^\$timescale\s*/, "").replace(/\s*\$end$/, "").trim();
      if (inline) timescale = inline;
      else {
        const valueLine = lines[index + 1]?.trim();
        if (valueLine && !valueLine.startsWith("$")) timescale = valueLine;
      }
      continue;
    }
    if (line.startsWith("$var")) {
      const fields = line.split(/\s+/);
      const width = Number(fields[2]);
      const id = fields[3];
      const localName = fields[4];
      if (Number.isFinite(width) && id && localName) {
        const name = [...scope, localName].join(".");
        signals.push({ id, name, width });
        changesBySignalId[id] = [];
      }
      continue;
    }
    if (line === "$enddefinitions $end") {
      inDefinitions = false;
      continue;
    }
    if (inDefinitions || line.startsWith("$")) continue;
    if (line.startsWith("#")) {
      currentTime = Number(line.slice(1));
      if (Number.isFinite(currentTime)) endTime = Math.max(endTime, currentTime);
      continue;
    }
    const scalar = line.match(/^([01xXzZ])(.+)$/);
    const vector = line.match(/^b([01xXzZ]+)\s+(.+)$/);
    const real = line.match(/^r([^\s]+)\s+(.+)$/);
    const match = vector ?? real;
    if (scalar) {
      const id = scalar[2].trim();
      if (changesBySignalId[id]) changesBySignalId[id].push({ time: currentTime, value: normalizeValue(scalar[1]) });
    } else if (match) {
      const id = match[2].trim();
      if (changesBySignalId[id]) changesBySignalId[id].push({ time: currentTime, value: normalizeValue(match[1]) });
    }
  }
  return { timescale, signals, changesBySignalId, endTime };
}

export function waveformSegments(changes: VcdChange[], endTime: number): WaveformSegment[] {
  if (changes.length === 0) return [];
  return changes.map((change, index) => ({
    from: change.time,
    to: index < changes.length - 1 ? changes[index + 1].time : Math.max(endTime, change.time + 1),
    value: change.value,
  }));
}
