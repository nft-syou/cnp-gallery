"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

// Each 遁術 label painted in its element colour.
const ELEMENT: Record<string, string> = {
  MOKUTON: "#5fb06a", KATON: "#ef5339", DOTON: "#c2954e", KINTON: "#e6c14a", SUITON: "#4193e6",
};

function ElementTick(props: { x?: number; y?: number; textAnchor?: string; payload?: { value?: string } }) {
  const v = props.payload?.value ?? "";
  return (
    <text
      x={props.x} y={props.y} dy={4}
      textAnchor={(props.textAnchor as "start" | "middle" | "end") ?? "middle"}
      fill={ELEMENT[v] ?? "#9b958b"}
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
            <radialGradient id="shu-fill" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#ff7361" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#ef4b3a" stopOpacity={0.12} />
            </radialGradient>
          </defs>
          <PolarGrid stroke="#2a2a34" />
          <PolarAngleAxis dataKey="stat" tick={<ElementTick />} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="#ff7361" strokeWidth={1.5}
            fill="url(#shu-fill)" dot={{ r: 2, fill: "#ff7361", strokeWidth: 0 }} isAnimationActive />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
