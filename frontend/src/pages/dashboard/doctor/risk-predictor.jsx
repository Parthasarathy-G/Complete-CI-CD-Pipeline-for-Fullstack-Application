// frontend/src/pages/dashboard/doctor/risk-predictor.jsx
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../../components/DashboardLayout";
import {
  Activity,
  HeartPulse,
  Droplets,
  UserRound,
  Stethoscope,
  Thermometer,
  Gauge,
  ChevronRight,
  XCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wand2,
  Info,
  Users2,
} from "lucide-react";

/** ---- Field schema split into sections for clarity ---- */
const SECTIONS = [
  { key: "demographics", title: "Patient", icon: UserRound, fields: ["name", "email", "age", "gender"] },
  { key: "vitals", title: "Vitals", icon: Thermometer, fields: ["sbp", "dbp", "bmi"] },
  {
    key: "labs",
    title: "Lab Results",
    icon: Gauge,
    fields: ["glucose", "tc", "hdl", "ldl", "hba1c", "alt", "ast", "creat", "egfr", "uacr", "bilirubin"],
  },
  { key: "history", title: "History & Lifestyle", icon: Stethoscope, fields: ["smoker", "dm", "htn", "fam_cad"] },
];

const fieldConfig = {
  name: { label: "Patient Name", desc: "Full name", type: "text" },
  email: { label: "Patient Email", desc: "Email address", type: "email" },
  age: { label: "Age", desc: "Years", type: "number", min: 0, max: 120, step: 1 },
  gender: {
    label: "Gender",
    type: "select",
    options: [
      { label: "Male", value: "1" },
      { label: "Female", value: "0" },
    ],
  },
  sbp: { label: "Systolic BP", unit: "mm Hg", type: "number", min: 60, max: 260, step: 1 },
  dbp: { label: "Diastolic BP", unit: "mm Hg", type: "number", min: 30, max: 160, step: 1 },
  bmi: { label: "BMI", unit: "kg/m²", type: "number", min: 10, max: 70, step: 0.1 },
  glucose: { label: "Fasting Glucose", unit: "mmol/L", type: "number", min: 2, max: 30, step: 0.1 },
  tc: { label: "Total Cholesterol", unit: "mmol/L", type: "number", min: 1, max: 15, step: 0.1 },
  hdl: { label: "HDL Cholesterol", unit: "mmol/L", type: "number", min: 0.1, max: 5, step: 0.1 },
  ldl: { label: "LDL Cholesterol", unit: "mmol/L", type: "number", min: 0.1, max: 10, step: 0.1 },
  hba1c: { label: "HbA1c", unit: "%", type: "number", min: 3, max: 20, step: 0.1 },
  alt: { label: "ALT (SGPT)", unit: "U/L", type: "number", min: 0, max: 2000, step: 1 },
  ast: { label: "AST (SGOT)", unit: "U/L", type: "number", min: 0, max: 2000, step: 1 },
  creat: { label: "Creatinine", unit: "mg/dL", type: "number", min: 0.1, max: 20, step: 0.1 },
  egfr: { label: "eGFR", unit: "mL/min/1.73m²", type: "number", min: 1, max: 200, step: 1 },
  uacr: { label: "UACR", unit: "mg/g", type: "number", min: 0, max: 5000, step: 1 },
  bilirubin: { label: "Bilirubin", unit: "mg/dL", type: "number", min: 0, max: 50, step: 0.1 },
  smoker: {
    label: "Smoker",
    type: "select",
    options: [
      { label: "No", value: "0" },
      { label: "Yes", value: "1" },
    ],
  },
  dm: {
    label: "Diabetes Dx",
    type: "select",
    options: [
      { label: "No", value: "0" },
      { label: "Yes", value: "1" },
    ],
  },
  htn: {
    label: "Hypertension Dx",
    type: "select",
    options: [
      { label: "No", value: "0" },
      { label: "Yes", value: "1" },
    ],
  },
  fam_cad: {
    label: "Family Hx CAD",
    type: "select",
    options: [
      { label: "No", value: "0" },
      { label: "Yes", value: "1" },
    ],
  },
};

const emptyForm = () => Object.fromEntries(Object.keys(fieldConfig).map((k) => [k, ""]));
const demoForm = () => ({
  name: "Draco Test",
  email: "draco@testclinic.nz",
  age: "58",
  gender: "1",
  sbp: "148",
  dbp: "94",
  bmi: "29.8",
  glucose: "7.8",
  tc: "6.2",
  hdl: "1.0",
  ldl: "4.2",
  hba1c: "7.9",
  alt: "38",
  ast: "29",
  creat: "1.4",
  egfr: "68",
  uacr: "180",
  bilirubin: "0.9",
  smoker: "1",
  dm: "1",
  htn: "1",
  fam_cad: "1",
});

const RiskPredictorPage = () => {
  const [formData, setFormData] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  // NEW: patient dropdown + auto-fill
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const authHeaders = () => {
    const tok =
      (typeof window !== "undefined" && (localStorage.getItem("token") || sessionStorage.getItem("token"))) ||
      "";
    return tok ? { Authorization: `Bearer ${tok}` } : {};
  };

  useEffect(() => {
    (async () => {
      setLoadingList(true);
      setStatusMsg("");
      try {
        const res = await axios.get("https://med2-jb6x.vercel.app/api/doctor/patients", {
          headers: authHeaders(),
        });
        setPatients(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setStatusMsg(e?.response?.data?.message || e?.message || "Failed to load patients.");
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  const n = (v) => (v === "" || v === null || v === undefined ? "" : Number(String(v).replace(/[^\d.\-]/g, "")));

  const getLabValue = (p, nameContains) => {
    const it = (p.labs || []).find((l) => String(l.name || "").toLowerCase().includes(nameContains));
    if (!it) return "";
    return n(it.value);
  };

  const toGender01 = (g) => {
    if (g === "1" || g === 1) return "1";
    if (g === "0" || g === 0) return "0";
    const s = String(g || "").toLowerCase();
    if (s.startsWith("m")) return "1";
    if (s.startsWith("f")) return "0";
    return "";
  };

  const autoFillFromPatient = async (id) => {
    setSelectedId(id);
    if (!id) return;

    setLoadingPatient(true);
    setStatusMsg("");
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/doctor/patients/${id}`, {
        headers: authHeaders(),
      });
      const p = res.data || {};

      const v = p.vitals || {};
      setFormData((prev) => ({
        ...prev,
        name: p.name || "",
        email: p.email || "",
        age: p.age != null ? String(p.age) : "",
        gender: toGender01(p.gender),

        // prefer top-level sbp/dbp/bmi if your patient doc has them; otherwise fallback to vitals
        sbp: p.sbp != null ? String(p.sbp) : v.bpSystolic != null ? String(v.bpSystolic) : "",
        dbp: p.dbp != null ? String(p.dbp) : v.bpDiastolic != null ? String(v.bpDiastolic) : "",
        bmi: p.bmi != null ? String(p.bmi) : v.bmi != null ? String(v.bmi) : "",

        // labs: try explicit fields first, then lab-array lookup
        hba1c: p.hba1c != null ? String(p.hba1c) : String(getLabValue(p, "hba1c") || ""),
        glucose: p.glucose != null ? String(p.glucose) : String(getLabValue(p, "glucose") || ""),
        tc: p.tc != null ? String(p.tc) : String(getLabValue(p, "cholesterol") || ""),
        hdl: p.hdl != null ? String(p.hdl) : String(getLabValue(p, "hdl") || ""),
        ldl: p.ldl != null ? String(p.ldl) : String(getLabValue(p, "ldl") || ""),
        alt: p.alt != null ? String(p.alt) : "",
        ast: p.ast != null ? String(p.ast) : "",
        creat: p.creat != null ? String(p.creat) : "",
        egfr: p.egfr != null ? String(p.egfr) : "",
        uacr: p.uacr != null ? String(p.uacr) : "",
        bilirubin: p.bilirubin != null ? String(p.bilirubin) : "",

        // lifestyle/history as "0"/"1"
        smoker: p.smoker != null ? String(p.smoker) : "",
        dm: p.dm != null ? String(p.dm) : "",
        htn: p.htn != null ? String(p.htn) : "",
        fam_cad: p.fam_cad != null ? String(p.fam_cad) : "",
      }));
    } catch (e) {
      setStatusMsg(e?.response?.data?.message || e?.message || "Failed to load patient details.");
    } finally {
      setLoadingPatient(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "number" ? value : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  /** Simple client-side validation */
  const validate = () => {
    const newErr = {};
    const required = ["name", "age", "gender", "sbp", "dbp", "bmi", "glucose", "hba1c"];
    required.forEach((k) => {
      if (formData[k] === "" || formData[k] == null) newErr[k] = "Required";
    });

    const num = (k) => (formData[k] === "" ? NaN : Number(formData[k]));
    if (!Number.isNaN(num("age")) && (num("age") < 0 || num("age") > 120)) newErr.age = "Age out of range";
    if (!Number.isNaN(num("sbp")) && (num("sbp") < 60 || num("sbp") > 260)) newErr.sbp = "SBP out of range";
    if (!Number.isNaN(num("dbp")) && (num("dbp") < 30 || num("dbp") > 160)) newErr.dbp = "DBP out of range";
    if (!Number.isNaN(num("bmi")) && (num("bmi") < 10 || num("bmi") > 70)) newErr.bmi = "BMI out of range";

    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setPrediction(null);
    try {
      // *** IMPORTANT: call FastAPI prediction endpoint, not Node create-patient ***
      const res = await axios.post(
        "http://127.0.0.1:8000/api/patient/add",
        { ...formData },
        {
          headers: { "Content-Type": "application/json", ...authHeaders() },
        }
      );
      // FastAPI returns { risk: { ... } }
      setPrediction(res.data);
    } catch (err) {
      // show more detailed backend error when possible
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message ||
        "Prediction failed. Check inputs or server logs.";
      console.error("Prediction failed:", err);
      alert(detail);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setErrors({});
  };

  const fillDemo = () => {
    setFormData(demoForm());
    setErrors({});
  };

  /** Reusable input renderer with unit pill + error text */
  const Field = ({ name }) => {
    const cfg = fieldConfig[name];
    const error = errors[name];

    if (cfg.type === "select") {
      return (
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 mb-1">{cfg.label}</label>
          <div className="relative">
            <select
              name={name}
              value={formData[name]}
              onChange={handleChange}
              className={`w-full border rounded-xl px-3 py-2 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                error ? "border-red-400" : "border-gray-300"
              }`}
            >
              <option value="">-- Select --</option>
              {cfg.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
          {cfg.label}
          {cfg.desc && (
            <span className="text-gray-400" title={cfg.desc}>
              <Info className="h-3.5 w-3.5" />
            </span>
          )}
        </label>
        <div
          className={`flex items-center rounded-xl border ${error ? "border-red-400" : "border-gray-300"} focus-within:ring-2 focus-within:ring-indigo-500 bg-white`}
        >
          <input
            name={name}
            type={cfg.type || "text"}
            value={formData[name]}
            onChange={handleChange}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            placeholder={cfg.desc || ""}
            className="w-full rounded-xl px-3 py-2 outline-none"
          />
          {cfg.unit && <span className="px-2 py-1 mr-1 text-xs rounded-lg bg-gray-100 text-gray-600">{cfg.unit}</span>}
        </div>
        {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="text-indigo-600" /> Risk Predictor
        </h1>
        <p className="text-gray-500 mt-1">
          Pick a patient to auto-fill, tweak values, then estimate <strong>cardiovascular</strong> and <strong>diabetes</strong> risk.
        </p>
      </div>

      {/* Patient picker */}
      <div className="mb-6 bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <Users2 className="text-indigo-600" />
              Select Patient
            </label>
            <select
              value={selectedId}
              onChange={(e) => autoFillFromPatient(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loadingList}
            >
              <option value="">{loadingList ? "Loading…" : "Choose…"}</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.age ? `• ${p.age}` : ""} {p.gender ? `• ${String(p.gender).startsWith("1") || /^m/i.test(p.gender) ? "Male" : "Female"}` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => autoFillFromPatient(selectedId)}
            disabled={!selectedId || loadingPatient}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
            title="Re-fill from selected patient"
          >
            {loadingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loadingPatient ? "Loading…" : "Refill"}
          </button>
         
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {SECTIONS.map(({ key, title, icon: Icon, fields }) => (
          <section key={key} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="text-indigo-600" />
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {fields.map((f) => (
                <Field key={f} name={f} />
              ))}
            </div>
          </section>
        ))}

        {/* Sticky action bar */}
        <div className="sticky bottom-4 z-10">
          <div className="mx-auto max-w-7xl bg-white/90 backdrop-blur shadow-lg rounded-2xl border border-gray-100 p-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={fillDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
            >
              <Wand2 className="h-4 w-4" /> Demo Fill
            </button>
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" /> Reset
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              {loading ? "Predicting..." : "Predict Risk"}
            </button>
          </div>
        </div>
      </form>

      {/* Result Modal */}
      <AnimatePresence>
        {prediction && (
          <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="text-emerald-600" /> Prediction Result
              </h2>

              <div className="space-y-6 text-gray-800 text-sm">
                {/* Cardio */}
                <div className="bg-gray-50 rounded-xl p-5 shadow-sm">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <HeartPulse className="text-red-500" /> Cardiovascular Risk
                  </h3>
                  <p>
                    <strong>Risk Level:</strong>{" "}
                    <span
                      className={`font-semibold ${
                        prediction?.risk?.cardio?.interpretation?.includes("High")
                          ? "text-red-600"
                          : prediction?.risk?.cardio?.interpretation?.includes("Moderate")
                          ? "text-yellow-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {Object.entries(prediction.risk.cardio.probabilities).reduce((a, b) => (a[1] > b[1] ? a : b))[0]}
                    </span>
                  </p>
                  <p className="mt-1">{prediction.risk.cardio.interpretation}</p>
                </div>

                {/* Diabetes */}
                <div className="bg-gray-50 rounded-xl p-5 shadow-sm">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Droplets className="text-emerald-500" /> Diabetes Risk
                  </h3>
                  <p>
                    <strong>Prediction:</strong>{" "}
                    <span className={`font-semibold ${prediction?.risk?.diabetes?.interpretation?.includes("High") ? "text-red-600" : "text-emerald-600"}`}>
                      {Object.entries(prediction.risk.diabetes.probabilities).reduce((a, b) => (a[1] > b[1] ? a : b))[0]}
                    </span>
                  </p>
                  <p className="mt-1">{prediction.risk.diabetes.interpretation}</p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setPrediction(null)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700">
                  <XCircle className="w-4 h-4" /> Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

RiskPredictorPage.getLayout = function getLayout(page) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default RiskPredictorPage;
