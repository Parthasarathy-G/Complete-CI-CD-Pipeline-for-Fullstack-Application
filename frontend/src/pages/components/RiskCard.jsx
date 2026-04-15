// frontend/src/pages/components/RiskCard.jsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1", "#3b82f6"];

export default function RiskCard({ risk, type = "cardio" }) {
  const block = risk?.[type];
  if (!block) return null;

  const THRESH = 0.35; // 35% threshold

  // Normalize a probability value to 0..1
  const normProb = (v) => {
    if (v == null) return null;
    const n = Number(v);
    if (isNaN(n)) return null;
    return n > 1 ? n / 100 : n; // accept 0..1 or 0..100
  };

  // Prefer normalized stored values if they exist, otherwise use raw keys
  const rawKey = type === "diabetes" ? "Yes" : "High";
  const rawProb =
    block?.probabilities?.[`${rawKey}_norm`] ?? block?.probabilities?.[rawKey];

  const p = normProb(rawProb);
  const pct = p != null ? Math.round(p * 100) : null;
  const isHigh = p != null ? p >= THRESH : false;

  // Prepare pie chart data: convert each probability to percentage for nicer chart labels
  const pieData = Object.entries(block.probabilities || {})
    .map(([k, v]) => {
      const n = normProb(v);
      // If this entry is an already-normalized _norm field, skip it to avoid duplicates
      if (/_norm$/i.test(k)) return null;
      return { name: k.replace("_", " "), value: n != null ? n * 100 : 0 };
    })
    .filter(Boolean);

  // Predicted label from predictor (if any)
  const predictedLabel = block?.predicted_risk ?? block?.prediction ?? null;

  // Detect mismatch between predictor's text label and numeric threshold
  let mismatch = false;
  if (predictedLabel) {
    const predLower = String(predictedLabel).toLowerCase();
    // common heuristics: "high" / "yes" indicate high risk
    const predHigh = /high|yes|positive|risk\/high|risk_high/i.test(predLower);
    if (p != null) mismatch = predHigh !== isHigh;
  }

  return (
    <Card className="rounded-2xl shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold mb-1 capitalize">
              {type === "diabetes" ? "Diabetes Risk" : "Cardiovascular Risk"}
            </h2>
            <p className="text-sm text-gray-500">
              Threshold for high: <strong>{Math.round(THRESH * 100)}%</strong>
            </p>
          </div>

          <div className="text-right">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isHigh ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              <span className="mr-2">{isHigh ? "High" : "Not high"}</span>
              <span className="font-semibold">{pct != null ? `${pct}%` : "—"}</span>
            </div>
            {predictedLabel && (
              <div
                className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  mismatch ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                }`}
                title={mismatch ? "Predicted label disagrees with numeric threshold" : ""}
              >
                <span className="mr-2">Predicted:</span>
                <span className="font-semibold">{predictedLabel}</span>
                {mismatch && <span className="ml-2 text-xs">(!)</span>}
              </div>
            )}
          </div>
        </div>

        {block?.interpretation && (
          <div className="mb-3 text-sm text-gray-700">{block.interpretation}</div>
        )}

        {pieData.length > 0 && (
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label={({ name, value }) => `${name} (${Math.round(value)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${Math.round(value)}%`}
                  itemStyle={{ color: "#111827" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Raw details to help clinicians — minimal and collapsible if you want */}
        <div className="mt-4 text-xs text-gray-500">
          <div className="font-medium mb-1">Probabilities (raw)</div>
          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(block?.probabilities ?? {}, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
