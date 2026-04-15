// pages/dashboard/doctor/patient/[id].jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import DashboardLayout from "../../../components/DashboardLayout";
import RiskCard from "../../../components/RiskCard";
import VitalsCard from "../../../components/VitalsCard";
import LabTable from "../../../components/LabTable";
import Loader from "../../../components/Loader";
import API, { getAuthHeaders } from "../../../../utils/api";
import PatientTimeline from "@/pages/components/PatientTimeline";
import Modal from "@/pages/components/Modal";

/** ---------- DUMMY DATA (used if API fails or returns empty) ---------- */
const DUMMY_PATIENTS = [
  {
    _id: "dummy-1",
    name: "John Carter",
    age: 58,
    gender: "1",
    risk: {
      cardio: { predicted_risk: "High" },
      diabetes: { prediction: "Diabetes risk/high" },
    },
    vitals: { heartRate: 84, bpSystolic: 148, bpDiastolic: 94, bmi: 29.8 },
    labs: [
      { name: "HbA1c", value: "7.9%", date: "2025-08-01" },
      { name: "LDL-C", value: "4.2 mmol/L", date: "2025-07-15" },
    ],
    timeline: [
      { date: "2025-08-15", event: "Medication adjusted: Metformin 1g bid" },
      { date: "2025-08-01", event: "Routine labs reviewed" },
      { date: "2025-07-20", event: "Cardio risk flagged: High" },
    ],
    medications: [],
  },
  {
    _id: "dummy-2",
    name: "Mereana Rangi",
    age: 46,
    gender: "0",
    risk: {
      cardio: { predicted_risk: "Moderate" },
      diabetes: { prediction: "Moderate" },
    },
    vitals: { heartRate: 76, bpSystolic: 132, bpDiastolic: 86, bmi: 27.1 },
    labs: [
      { name: "HbA1c", value: "6.4%", date: "2025-07-28" },
      { name: "LDL-C", value: "3.1 mmol/L", date: "2025-07-10" },
    ],
    timeline: [
      { date: "2025-08-12", event: "Lifestyle counseling session" },
      { date: "2025-07-28", event: "HbA1c borderline" },
    ],
    medications: [],
  },
  {
    _id: "dummy-3",
    name: "Arun Kumar",
    age: 35,
    gender: "1",
    risk: {
      cardio: { predicted_risk: "Low" },
      diabetes: { prediction: "Low" },
    },
    vitals: { heartRate: 72, bpSystolic: 122, bpDiastolic: 78, bmi: 23.4 },
    labs: [{ name: "HbA1c", value: "5.2%", date: "2025-07-05" }],
    timeline: [{ date: "2025-07-05", event: "Annual check-up completed" }],
    medications: [],
  },
  {
    _id: "dummy-4",
    name: "Sofia Lee",
    age: 29,
    gender: "0",
    risk: {
      cardio: { predicted_risk: "Low" },
      diabetes: { prediction: "Moderate" },
    },
    vitals: { heartRate: 69, bpSystolic: 118, bpDiastolic: 74, bmi: 21.6 },
    labs: [{ name: "Fasting Glucose", value: "5.9 mmol/L", date: "2025-08-10" }],
    timeline: [{ date: "2025-08-10", event: "Borderline glucose noted" }],
    medications: [],
  },
  {
    _id: "dummy-5",
    name: "Wiremu Te Ao",
    age: 64,
    gender: "1",
    risk: {
      cardio: { predicted_risk: "High" },
      diabetes: { prediction: "Moderate" },
    },
    vitals: { heartRate: 81, bpSystolic: 150, bpDiastolic: 96, bmi: 30.5 },
    labs: [
      { name: "HbA1c", value: "6.8%", date: "2025-08-03" },
      { name: "Triglycerides", value: "2.0 mmol/L", date: "2025-07-21" },
    ],
    timeline: [
      { date: "2025-08-14", event: "Referred for cardio consult" },
      { date: "2025-08-03", event: "HbA1c mildly elevated" },
    ],
    medications: [],
  },
];

const PatientDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDummy, setIsDummy] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [medication, setMedication] = useState({
    name: "",
    dose: "",
    instructions: "",
  });

  const selectedDummy = useMemo(() => {
    if (!id) return null;
    return DUMMY_PATIENTS.find((p) => p._id === id) || DUMMY_PATIENTS[0];
  }, [id]);

  const fetchData = async () => {
    try {
      const [patientRes, timelineRes] = await Promise.all([
        API.get(`/doctor/patients/${id}`, { headers: getAuthHeaders() }),
        API.get(`/doctor/patients/${id}/timeline`, { headers: getAuthHeaders() }),
      ]);

      let merged = { ...patientRes.data, timeline: timelineRes.data || [] };

      // Ensure vitals/labs exist for your cards/tables
      if (!merged.vitals)
        merged.vitals = { heartRate: 76, bpSystolic: 126, bpDiastolic: 82, bmi: 26.1 };
      if (!merged.labs) merged.labs = [{ name: "HbA1c", value: "6.0%", date: "2025-08-10" }];

      setPatient(merged);
      setIsDummy(false);
    } catch (err) {
      // Backend failed — use dummy
      if (selectedDummy) {
        setPatient({ ...selectedDummy });
        setIsDummy(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDownload = async () => {
    if (isDummy) {
      // Create a simple local “report” in JSON for demo mode
      const blob = new Blob([JSON.stringify(patient, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Patient_Report_${id}_DEMO.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }

    try {
      const response = await API.get(`/doctor/patients/${id}/download`, {
        headers: getAuthHeaders(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Patient_Report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed", error);
      alert("Failed to download report.");
    }
  };

  const handleAddMedication = async () => {
    const name = medication.name?.trim();
    if (!name) {
      alert("Please add a medication name.");
      return;
    }

    if (isDummy) {
      // Demo mode: update local state & timeline
      setPatient((prev) => {
        const meds = Array.isArray(prev?.medications) ? prev.medications : [];
        const existing = meds.find(
          (m) => (m.name || "").toLowerCase() === name.toLowerCase()
        );
        let nextMeds;
        if (existing) {
          nextMeds = meds.map((m) =>
            (m.name || "").toLowerCase() === name.toLowerCase()
              ? {
                  ...m,
                  dose: medication.dose,
                  instructions: medication.instructions,
                  date: new Date().toISOString(),
                }
              : m
          );
        } else {
          nextMeds = [...meds, { ...medication, date: new Date().toISOString() }];
        }
        return { ...prev, medications: nextMeds };
      });
      setPatient((prev) => ({
        ...prev,
        timeline: [
          {
            date: new Date().toISOString(),
            event: `Medication ${
              prev?.medications?.some(
                (m) => (m.name || "").toLowerCase() === name.toLowerCase()
              )
                ? "updated"
                : "added"
            }: ${name}`,
          },
          ...(prev.timeline || []),
        ],
      }));
      setShowModal(false);
      setMedication({ name: "", dose: "", instructions: "" });
      return;
    }

    try {
      // If medication exists, ask to confirm update
      const exists = (patient?.medications || []).some(
        (m) => (m.name || "").toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        const ok = confirm(
          `${name} is already prescribed. Do you want to update the dosage/instructions?`
        );
        if (!ok) return;
      }

      // Use doctor endpoint that adds/updates + writes timeline
      await API.post(
        `/doctor/patient/${id}/medications`,
        { name, dose: medication.dose, instructions: medication.instructions },
        { headers: getAuthHeaders() }
      );

      setShowModal(false);
      setMedication({ name: "", dose: "", instructions: "" });
      fetchData(); // refresh from backend to show updated meds & timeline
    } catch (err) {
      console.error("Failed to add/update medication", err);
      alert("Medication save failed");
    }
  };

  if (loading) return <Loader />;

  if (!patient) {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-white p-6">
          <p className="text-gray-600">Patient not found.</p>
        </div>
      </div>
    );
  }

  const genderText =
    patient.gender === "1" ||
    patient.gender === 1 ||
    /male/i.test(String(patient.gender || ""))
      ? "Male"
      : patient.gender === "0" ||
        patient.gender === 0 ||
        /female/i.test(String(patient.gender || ""))
      ? "Female"
      : patient.gender || "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-1">{patient.name}</h1>
          <p className="text-gray-600">
            Age: {patient.age} | Gender: {genderText}
          </p>
          {isDummy && (
            <span className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              Demo mode (no backend)
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Download Report
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            Add Medication
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RiskCard type="cardio" risk={patient.risk} />
        <RiskCard type="diabetes" risk={patient.risk} />
      </div>

      <VitalsCard patient={patient} onSaved={fetchData} />
      <LabTable patient={patient} onSaved={fetchData} />

      {/* Medications */}
      <div className="rounded-2xl shadow-md bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Medications</h2>
        {!patient.medications || patient.medications.length === 0 ? (
          <p className="text-gray-500">No medications yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {patient.medications
              .slice()
              .reverse()
              .map((m, i) => (
                <li
                  key={`${m.name}-${i}`}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="text-sm text-gray-600">
                      {m.dose ? `Dose: ${m.dose}` : "—"}
                      {m.instructions ? ` • ${m.instructions}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {m.date ? new Date(m.date).toLocaleDateString() : ""}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Patient Timeline */}
      <div className="rounded-2xl shadow-md bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Patient Timeline</h2>
        <PatientTimeline timeline={patient.timeline || []} />
      </div>

      {/* Add Medication Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2 className="text-xl font-semibold mb-4">Add Medication</h2>
          <div className="space-y-4">
            <input
              placeholder="Medication Name"
              value={medication.name}
              onChange={(e) =>
                setMedication((p) => ({ ...p, name: e.target.value }))
              }
              className="w-full border rounded px-3 py-2"
            />
            <input
              placeholder="Dose"
              value={medication.dose}
              onChange={(e) =>
                setMedication((p) => ({ ...p, dose: e.target.value }))
              }
              className="w-full border rounded px-3 py-2"
            />
            <input
              placeholder="Instructions"
              value={medication.instructions}
              onChange={(e) =>
                setMedication((p) => ({ ...p, instructions: e.target.value }))
              }
              className="w-full border rounded px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddMedication}
                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};

PatientDetailPage.getLayout = function getLayout(page) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default PatientDetailPage;
