"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

// Each 遁術 label painted in its element colour.
const ELEMENT: Record<string, string> = {
  MOKUTON: "#41ad5d", KATON: "#ff5a3c", DOTON: "#c98a3e", KINTON: "#efb301", SUITON: "#2e8fe6",
};

function ElementTick(props: { x?: number; y?: number; textAnchor?: string; payload?: { value?: string } }) {
  const v = props.payload?.value ?? "";
  return (
    <text
      x={props.x} y={props.y} dy={4}
      textAnchor={(props.textAnchor as "start" | "middle" | "end") ?? "middle"}
      fill={ELEMENT[v] ?? "#6c685f"}
      fontSize={10} fontWeight={700} letterSpacing="0.06em"
    >
      {v}
    </text>
  );
}

// On hover (desktop) / tap (mobile) over a vertex, surface the raw 0–10 value.
function RadarTip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload?: { stat?: string; value?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const stat = row?.stat ?? "";
  return (
    <div className="rounded-lg border border-line bg-white px-2.5 py-1.5 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]">
      <span style={{ color: ELEMENT[stat] ?? "#6c685f" }} className="text-[10px] font-bold tracking-[0.06em]">{stat}</span>
      <span className="ml-2 text-sm font-black tabular-nums text-ink">{row?.value ?? "—"}</span>
    </div>
  );
}

export function StatRadar({ data }: { data: { stat: string; value: number }[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            <radialGradient id="cnp-fill" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#ffd600" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#ffca00" stopOpacity={0.18} />
            </radialGradient>
          </defs>
          <PolarGrid stroke="#e6e3da" />
          <PolarAngleAxis dataKey="stat" tick={<ElementTick />} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Tooltip content={<RadarTip />} cursor={false} wrapperStyle={{ outline: "none" }} />
          <Radar dataKey="value" stroke="#e6a700" strokeWidth={1.75}
            fill="url(#cnp-fill)"
            dot={{ r: 3, fill: "#e6a700", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#e6a700", stroke: "#fff", strokeWidth: 2 }}
            isAnimationActive />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
