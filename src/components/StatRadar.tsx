"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

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
          <Radar dataKey="value" stroke="#e6a700" strokeWidth={1.75}
            fill="url(#cnp-fill)" dot={{ r: 2, fill: "#e6a700", strokeWidth: 0 }} isAnimationActive />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
