// frontend/src/pages/dashboard/doctor/patients.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import DashboardLayout from "@/pages/components/DashboardLayout";
import Loader from "@/pages/components/Loader";
import API, { getAuthHeaders } from "../../../utils/api";

// helpers to normalize risk display for both old & new shapes
function topLabel(probs) {
  if (!probs) return null;
  const entries = Object.entries(probs);
  if (!entries.length) return null;
  return entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0][0];
}
function cardioLabel(risk) {
  // new shape: probabilities { High, Low } + interpretation
  const interp = risk?.cardio?.interpretation;
  const probs = risk?.cardio?.probabilities;
  const predicted = risk?.cardio?.predicted_risk; // old shape
  return predicted || interp || topLabel(probs) || "Low";
}
function diabetesLabel(risk) {
  // new shape: probabilities { Yes, No } + interpretation
  const interp = risk?.diabetes?.interpretation;
  const probs = risk?.diabetes?.probabilities;
  const pred = risk?.diabetes?.prediction; // old shape
  // map "Yes"/"No" to friendly labels if needed
  const label = pred || interp || topLabel(probs);
  if (label === "Yes") return "High";
  if (label === "No") return "Low";
  return label || "Low";
}
function genderText(g) {
  if (g === "1" || g === 1 || /^m(ale)?$/i.test(String(g))) return "Male";
  if (g === "0" || g === 0 || /^f(emale)?$/i.test(String(g))) return "Female";
  return g || "—";
}

function badgeClass(level) {
  const lvl = String(level || "").toLowerCase();
  if (lvl.includes("high")) return "bg-red-50 text-red-700 ring-1 ring-red-200";
  if (lvl.includes("moderate") || lvl.includes("medium"))
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  if (lvl.includes("yes")) return "bg-red-50 text-red-700 ring-1 ring-red-200";
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
}

function AssignedPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        // use working base (/api/patient). cache-buster avoids 304 during dev
        const res = await API.get("/patient", {
          headers: getAuthHeaders(),
          params: { _t: Date.now() },
        });
        if (!dead) setPatients(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!dead) setErr(e?.response?.data?.message || e.message || "Failed to load patients.");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  const list = useMemo(() => patients, [patients]);

  return (
    <div className="p-6">
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-3xl font-bold mb-2 tracking-tight"
      >
        Patients
      </motion.h1>
      <p className="text-gray-500 mb-6">Patients in the system.</p>

      {loading ? (
        <div className="text-gray-500">
          <Loader />
        </div>
      ) : err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          No patients found.
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } }, hidden: {} }}
        >
          {list.map((p) => {
            const cardio = cardioLabel(p.risk);
            const diabetes = diabetesLabel(p.risk);
            return (
              <motion.div
                key={p._id}
                className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="p-5">
                  {/* avatar initials */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white grid place-items-center text-base font-bold">
                      {p.name?.split(" ").slice(0, 2).map((s) => s[0]).join("") || "PT"}
                    </div>
                    <div>
                      <div className="font-semibold text-lg leading-tight">{p.name}</div>
                      <div className="text-sm text-gray-500">
                        Age {p.age ?? "—"} • {genderText(p.gender)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">Cardio</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(cardio)}`}>
                        {cardio}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">Diabetes</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(diabetes)}`}>
                        {diabetes}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/dashboard/doctor/patient/${p._id}`}
                      className="inline-flex items-center justify-center rounded-full border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-600 hover:text-white transition-colors"
                    >
                      View Report
                      <svg className="ml-2 h-4 w-4" viewBox="0 0 16 19" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z"
                          className="fill-current"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

AssignedPatientsPage.getLayout = function getLayout(page) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default AssignedPatientsPage;
