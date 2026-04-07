// frontend/src/pages/components/LabTable.jsx
import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import API, { getAuthHeaders } from "../../utils/api";

export default function LabTable({ patient = {}, onSaved }) {
  // canonical lab labels we show/edit (order matters for chart)
  const LAB_DEFS = [
    { label: "HbA1c", name: "HbA1c" },
    { label: "ALT", name: "ALT" },
    { label: "AST", name: "AST" },
    { label: "Creatinine", name: "Creatinine" },
    { label: "eGFR", name: "eGFR" },
    { label: "UACR", name: "UACR" },
    { label: "Bilirubin", name: "Bilirubin" },
  ];

  // Build initial map of lab values from patient:
  // prefer patient.labs array entries (if present), otherwise fallback to top-level fields (hba1c, alt, etc.)
  const initialLabsMap = useMemo(() => {
    const map = {};
    // from patient.labs array (if exists)
    if (Array.isArray(patient.labs)) {
      for (const item of patient.labs) {
        if (item?.name) {
          // value may be string; coerce to number when possible
          const parsed = item.value === "" || item.value == null ? null : Number(item.value);
          map[item.name] = isNaN(parsed) ? item.value : parsed;
        }
      }
    }

    // fallback to top-level fields used previously in this app
    const fallback = {
      HbA1c: patient.hba1c,
      ALT: patient.alt,
      AST: patient.ast,
      Creatinine: patient.creat,
      eGFR: patient.egfr,
      UACR: patient.uacr,
      Bilirubin: patient.bilirubin,
    };
    for (const def of LAB_DEFS) {
      if (map[def.name] === undefined && fallback[def.label] !== undefined) {
        map[def.name] = fallback[def.label];
      }
      // also support label keys mapping (HbA1c vs hba1c fallback)
      if (map[def.name] === undefined && fallback[def.label] !== undefined) {
        map[def.name] = fallback[def.label];
      }
    }

    // ensure keys exist (null if absent)
    for (const def of LAB_DEFS) {
      if (!Object.prototype.hasOwnProperty.call(map, def.name)) map[def.name] = null;
    }
    return map;
  }, [patient]);

  const [editing, setEditing] = useState(false);
  const [labsState, setLabsState] = useState(initialLabsMap);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // If patient changes, reset local state
  React.useEffect(() => {
    setLabsState(initialLabsMap);
    setEditing(false);
    setMsg(null);
  }, [initialLabsMap]);

  // Prepare chart data from current (display) values (numbers only)
  const chartData = LAB_DEFS
    .map((d) => ({ name: d.label, value: Number(labsState[d.name]) }))
    .filter((d) => !isNaN(d.value) && d.value !== null);

  // Handle input change
  const onChange = (name, raw) => {
    // allow empty string to clear
    let next = raw;
    if (raw === "") next = null;
    // if value looks numeric, convert to Number (but keep null for empty)
    if (raw !== "" && raw != null) {
      const asNum = Number(raw);
      next = isNaN(asNum) ? raw : asNum;
    }
    setLabsState((s) => ({ ...s, [name]: next }));
  };

  // Build labs array payload for backend: [{name, value, date}]
  const buildPayloadLabs = () => {
    return LAB_DEFS.map((d) => {
      const v = labsState[d.name];
      return {
        name: d.name,
        value: v == null || v === "" ? null : v,
        date: null,
      };
    });
  };

  // Save handler: POST /api/patient/profile
  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        labs: buildPayloadLabs(),
      };
      const endpoint = patient && patient._id ? `/patient/${patient._id}/profile` : "/patient/profile";
      const res = await API.post(endpoint, payload, { headers: getAuthHeaders() });
      // success - call onSaved if provided so parent can refresh patient data
      setMsg("Saved.");
      setEditing(false);
      if (typeof onSaved === "function") onSaved(res.data);
      // optionally set labsState to whatever backend returned
      setLabsState((prev) => prev); // keep current (server may normalize)
    } catch (err) {
      console.error("Failed to save labs", err);
      setMsg(err?.response?.data?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Cancel edits
  const handleCancel = () => {
    setLabsState(initialLabsMap);
    setEditing(false);
    setMsg(null);
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-semibold">Lab Results</h2>
        <div className="flex items-center gap-2">
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
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
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

      {msg && (
        <div className="mb-3 text-sm">
          <span className="text-gray-700">{msg}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto mb-6">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 text-sm font-semibold text-gray-700">
                Test
              </th>
              <th className="px-4 py-2 text-sm font-semibold text-gray-700">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {LAB_DEFS.map((lab, idx) => {
              const val = labsState[lab.name];
              return (
                <tr key={lab.name} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-800">{lab.label}</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {!editing ? (
                      val == null || val === "" ? (
                        "N/A"
                      ) : (
                        String(val)
                      )
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={val == null ? "" : val}
                        onChange={(e) => onChange(lab.name, e.target.value)}
                        className="w-32 px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="—"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {chartData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
