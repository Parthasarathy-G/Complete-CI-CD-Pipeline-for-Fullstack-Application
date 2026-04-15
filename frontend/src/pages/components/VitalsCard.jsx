// frontend/src/pages/components/VitalsCard.jsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import API, { getAuthHeaders } from "../../utils/api";

export default function VitalsCard({ patient = {}, onSaved }) {
  // The UI displays a few fields; only vitals are editable (SBP, DBP, BMI, smoking)
  // Keep age/gender readonly
  const displayFields = [
    { label: "Age", key: "age", editable: false },
    { label: "Gender", key: "gender", editable: false },
    { label: "SBP", key: "systolic_bp", editable: true },
    { label: "DBP", key: "diastolic_bp", editable: true },
    { label: "BMI", key: "bmi", editable: true },
    { label: "Smoking Status", key: "smoking_status", editable: true },
  ];

  // Build initial vitals map from patient - support multiple naming conventions:
  const deriveInitial = (p) => {
    return {
      // vitals object preferred
      heartRate:
        p?.vitals?.heartRate ??
        p?.heartRate ??
        p?.hr ??
        null,
      bpSystolic:
        p?.vitals?.bpSystolic ??
        p?.bpSystolic ??
        p?.systolic_bp ??
        p?.systolicBP ??
        null,
      bpDiastolic:
        p?.vitals?.bpDiastolic ??
        p?.bpDiastolic ??
        p?.diastolic_bp ??
        p?.diastolicBP ??
        null,
      bmi:
        p?.vitals?.bmi ??
        p?.bmi ??
        null,
      smoking_status:
        p?.smoking_status ??
        (p?.smoker === true ? 2 : p?.smoker === "1" ? 2 : p?.smoker === "0" ? 0 : undefined) ??
        null,
      // Also map legacy top-level fields used in your original VitalsCard:
      age: p?.age ?? null,
      gender: p?.gender ?? null,
    };
  };

  const [editing, setEditing] = React.useState(false);
  const [vitals, setVitals] = React.useState(deriveInitial(patient));
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  // Keep local state in sync when patient prop changes
  React.useEffect(() => {
    setVitals(deriveInitial(patient));
    setEditing(false);
    setMsg(null);
  }, [patient]);

  // Chart data computed from numeric fields in the card (SBP, DBP, BMI)
  const chartData = [
    { name: "SBP", value: Number(vitals.bpSystolic) },
    { name: "DBP", value: Number(vitals.bpDiastolic) },
    { name: "BMI", value: Number(vitals.bmi) },
  ].filter((d) => !isNaN(d.value) && d.value !== null);

  const onChange = (key, raw) => {
    // convert empty string to null, else numeric parse
    let val = raw;
    if (raw === "") val = null;
    if (raw != null && raw !== "") {
      const n = Number(raw);
      val = isNaN(n) ? raw : n;
    }
    setVitals((s) => ({ ...s, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      // Build vitals payload (keys expected by backend: bpSystolic, bpDiastolic, bmi, heartRate maybe)
      const payloadVitals = {
        heartRate: vitals.heartRate == null ? null : vitals.heartRate,
        bpSystolic: vitals.bpSystolic == null ? null : vitals.bpSystolic,
        bpDiastolic: vitals.bpDiastolic == null ? null : vitals.bpDiastolic,
        bmi: vitals.bmi == null ? null : vitals.bmi,
      };

      // Smoking: send as numeric code if available
      const smoking = vitals.smoking_status;
      if (smoking !== undefined) payloadVitals.smoking_status = smoking;

      // Determine endpoint: doctor editing a patient uses /patient/:id/profile
      const id = patient?._id || patient?.id;
      const endpoint = id ? `/patient/${id}/profile` : "/patient/profile";

      const body = { vitals: payloadVitals };

      await API.post(endpoint, body, { headers: getAuthHeaders() });

      setMsg("Saved.");
      setEditing(false);
      if (typeof onSaved === "function") onSaved(); // refresh parent
    } catch (err) {
      console.error("Failed to save vitals", err);
      setMsg(err?.response?.data?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setVitals(deriveInitial(patient));
    setEditing(false);
    setMsg(null);
  };

  // helper to display smoking label
  const smokingLabel = (v) => {
    if (v === 1 || String(v) === "1") return "Former Smoker";
    if (v === 2 || String(v) === "2") return "Current Smoker";
    return "Non-Smoker";
  };

  return (
    <Card className="rounded-2xl shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold">Vitals</h2>
          <div>
            {!editing ? (
              <button
                onClick={() => {
                  setEditing(true);
                  setMsg(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 mr-2"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {msg && <div className="mb-3 text-sm text-gray-700">{msg}</div>}

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Age / Gender are readonly */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Age</span>
            <span className="text-gray-900 font-semibold">
              {vitals.age ?? "N/A"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Gender</span>
            <span className="text-gray-900 font-semibold">
              {vitals.gender ?? "N/A"}
            </span>
          </div>

          {/* SBP */}
          <div className="flex flex-col">
            <label className="text-gray-500 text-sm">SBP</label>
            {!editing ? (
              <div className="text-gray-900 font-semibold mt-1">
                {vitals.bpSystolic ?? "N/A"}
              </div>
            ) : (
              <input
                type="number"
                step="1"
                value={vitals.bpSystolic == null ? "" : vitals.bpSystolic}
                onChange={(e) => onChange("bpSystolic", e.target.value)}
                className="mt-1 px-2 py-1 rounded border border-gray-200 w-full"
              />
            )}
          </div>

          {/* DBP */}
          <div className="flex flex-col">
            <label className="text-gray-500 text-sm">DBP</label>
            {!editing ? (
              <div className="text-gray-900 font-semibold mt-1">
                {vitals.bpDiastolic ?? "N/A"}
              </div>
            ) : (
              <input
                type="number"
                step="1"
                value={vitals.bpDiastolic == null ? "" : vitals.bpDiastolic}
                onChange={(e) => onChange("bpDiastolic", e.target.value)}
                className="mt-1 px-2 py-1 rounded border border-gray-200 w-full"
              />
            )}
          </div>

          {/* BMI */}
          <div className="flex flex-col">
            <label className="text-gray-500 text-sm">BMI</label>
            {!editing ? (
              <div className="text-gray-900 font-semibold mt-1">
                {vitals.bmi ?? "N/A"}
              </div>
            ) : (
              <input
                type="number"
                step="0.1"
                value={vitals.bmi == null ? "" : vitals.bmi}
                onChange={(e) => onChange("bmi", e.target.value)}
                className="mt-1 px-2 py-1 rounded border border-gray-200 w-full"
              />
            )}
          </div>

          {/* Smoking Status */}
          <div className="flex flex-col">
            <label className="text-gray-500 text-sm">Smoking Status</label>
            {!editing ? (
              <div className="text-gray-900 font-semibold mt-1">
                {smokingLabel(vitals.smoking_status)}
              </div>
            ) : (
              <select
                value={vitals.smoking_status == null ? "" : vitals.smoking_status}
                onChange={(e) => onChange("smoking_status", e.target.value)}
                className="mt-1 px-2 py-1 rounded border border-gray-200 w-full"
              >
                <option value="">Select</option>
                <option value="0">Non-Smoker</option>
                <option value="1">Former Smoker</option>
                <option value="2">Current Smoker</option>
              </select>
            )}
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
