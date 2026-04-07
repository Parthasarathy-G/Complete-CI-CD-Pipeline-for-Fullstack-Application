// frontend/src/pages/dashboard/patient.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Stethoscope, Search, FileText, Download, X, Heart, CheckCircle2, Plus, Upload, Activity } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://med2-vgw1.onrender.com";

export default function PatientDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [reports, setReports] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [booking, setBooking] = useState({ date: "", time: "", reason: "" });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMsg, setBookingMsg] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMsg, setReportMsg] = useState("");
  const [reportForm, setReportForm] = useState({ title: "", date: "", description: "", file: null });
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientMsg, setPatientMsg] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [risk, setRisk] = useState({ cardio: "Low", diabetes: "Low" });
  const hasAutoOpenedReport = useRef(false);
  const hasAutoOpenedPatient = useRef(false);
  const abortRef = useRef(null);

  const getHeaders = () => {
    try {
      const tok = typeof window !== "undefined" ? (localStorage.getItem("token") || sessionStorage.getItem("token")) : null;
      return tok ? { Authorization: `Bearer ${tok}` } : {};
    } catch {
      return {};
    }
  };

  const computeRisk = (vitals = {}, labs = []) => {
    let cardioScore = 0;
    let dmScore = 0;
    const systolic = Number(vitals.bpSystolic || 0);
    const diastolic = Number(vitals.bpDiastolic || 0);
    const bmi = Number(vitals.bmi || 0);
    const hr = Number(vitals.heartRate || 0);
    const a1cItem = labs.find((l) => /hba1c/i.test(l.name || ""));
    const tgItem = labs.find((l) => /triglycerides/i.test(l.name || ""));
    const a1c = a1cItem ? Number(String(a1cItem.value).replace(/[^\d.]/g, "")) : 0;
    const tg = tgItem ? Number(String(tgItem.value).replace(/[^\d.]/g, "")) : 0;
    if (systolic >= 140 || diastolic >= 90) cardioScore += 2;
    else if (systolic >= 130 || diastolic >= 80) cardioScore += 1;
    if (bmi >= 30) cardioScore += 2; else if (bmi >= 25) cardioScore += 1;
    if (hr >= 100 || hr <= 50) cardioScore += 1;
    if (tg >= 2.3) cardioScore += 2; else if (tg >= 1.7) cardioScore += 1;
    if (a1c >= 6.5) dmScore += 3; else if (a1c >= 5.7) dmScore += 1;
    if (bmi >= 30) dmScore += 2; else if (bmi >= 25) dmScore += 1;
    const cardio = cardioScore >= 4 ? "High" : cardioScore >= 2 ? "Medium" : "Low";
    const diabetes = dmScore >= 4 ? "High" : dmScore >= 2 ? "Medium" : "Low";
    return { cardio, diabetes };
  };

  const fetchAll = async () => {
    setErr("");
    setLoading(true);
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const [docsRes, apptRes, repRes, patientRes] = await Promise.all([
        axios.get(`${API}/api/patient/doctors`, { headers: getHeaders(), signal: controller.signal }),
        axios.get(`${API}/api/patient/appointments/upcoming`, { headers: getHeaders(), signal: controller.signal }),
        axios.get(`${API}/api/patient/reports`, { headers: getHeaders(), signal: controller.signal }),
        axios.get(`${API}/api/patient/profile`, { headers: getHeaders(), signal: controller.signal }).catch(() => ({ data: null })),
      ]);
      const docs = Array.isArray(docsRes?.data) ? docsRes.data : [];
      const appts = Array.isArray(apptRes?.data) ? apptRes.data : [];
      const reps = Array.isArray(repRes?.data) ? repRes.data : [];
      const pat = patientRes?.data || null;
      setDoctors(docs);
      setAppointments(appts);
      setReports(reps);
      setPatient(pat);
      if (pat && (pat.vitals || pat.labs)) setRisk(computeRisk(pat.vitals, pat.labs || []));
      setUpdatedAt(new Date());
      if (!hasAutoOpenedReport.current && reps.length === 0) {
        hasAutoOpenedReport.current = true;
        setReportOpen(true);
      }
      if (!hasAutoOpenedPatient.current && !pat) {
        hasAutoOpenedPatient.current = true;
        setPatientOpen(true);
      }
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
        setErr(e?.response?.data?.message || e?.message || "Could not load your dashboard.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    return () => abortRef.current?.abort?.();
  }, []);

  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) =>
      [d?.name, d?.specialization, d?.hospital, d?.about]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [doctors, search]);

  const openBooking = (doc) => {
    setSelectedDoctor(doc);
    setBooking({ date: "", time: "", reason: "" });
    setBookingMsg("");
    setBookingOpen(true);
  };

  const submitBooking = async () => {
    setBookingMsg("");
    if (!selectedDoctor) return;
    if (!booking.date || !booking.time || !booking.reason.trim()) {
      setBookingMsg("Please choose a date, time, and briefly describe your reason.");
      return;
    }
    setBookingLoading(true);
    try {
      await axios.post(
        `${API}/api/patient/appointments/book`,
        { doctorId: selectedDoctor._id, date: booking.date, time: booking.time, reason: booking.reason.trim() },
        { headers: getHeaders() } // <-- FIXED
      );
      setBookingMsg("Booked! You’ll see it in your upcoming list.");
      setTimeout(() => {
        setBookingOpen(false);
        fetchAll();
      }, 600);
    } catch (e) {
      setBookingMsg(e?.response?.data?.message || e?.message || "Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const manualOpenReport = () => {
    setReportForm({ title: "", date: "", description: "", file: null });
    setReportMsg("");
    setReportOpen(true);
  };

  const submitReport = async () => {
    setReportMsg("");
    const { title, date, description, file } = reportForm;
    if (!title.trim() || !date || !description.trim()) {
      setReportMsg("Please fill Title, Date and Description.");
      return;
    }
    setReportLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("date", date);
      fd.append("description", description.trim());
      if (file) fd.append("file", file);
      await axios.post(`${API}/api/patient/reports`, fd, {
        headers: { ...getHeaders(), "Content-Type": "multipart/form-data" },
      });
      setReportMsg("Report added successfully!");
      setTimeout(() => {
        setReportOpen(false);
        fetchAll();
      }, 600);
    } catch (e) {
      setReportMsg(e?.response?.data?.message || e?.message || "Failed to add report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  };

  const [patientForm, setPatientForm] = useState({
    name: "",
    age: "",
    gender: "1",
    vitals: { heartRate: "", bpSystolic: "", bpDiastolic: "", bmi: "" },
    labs: [
      { name: "HbA1c", value: "", date: "" },
      { name: "Triglycerides", value: "", date: "" },
    ],
  });

  const submitPatient = async () => {
    setPatientMsg("");
    const v = patientForm.vitals || {};
    if (!patientForm.name.trim() || !patientForm.age || !v.bpSystolic || !v.bpDiastolic || !v.bmi) {
      setPatientMsg("Fill all required fields.");
      return;
    }
    setPatientLoading(true);
    try {
      const payload = {
        ...patientForm,
        age: Number(patientForm.age),
        vitals: {
          ...v,
          heartRate: v.heartRate ? Number(v.heartRate) : null,
          bpSystolic: Number(v.bpSystolic),
          bpDiastolic: Number(v.bpDiastolic),
          bmi: Number(v.bmi),
        },
      };
      await axios.post(`${API}/api/patient/profile`, payload, { headers: getHeaders() });
      setPatient(payload);
      setRisk(computeRisk(payload.vitals, payload.labs));
      setPatientMsg("Saved");
      setTimeout(() => {
        setPatientOpen(false);
        fetchAll();
      }, 500);
    } catch (e) {
      setPatientMsg(e?.response?.data?.message || e?.message || "Failed to save.");
    } finally {
      setPatientLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-br from-[#f6f7ff] via-white to-[#f7efff] border border-white/60 shadow-[0_10px_30px_rgba(87,70,175,0.08)] mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs text-gray-600 shadow-sm mb-3">
                <Heart className="h-4 w-4 text-indigo-600" />
                Welcome back
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Patient Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Search & book doctors, and access your medical reports.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={manualOpenReport} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-indigo-700 border border-indigo-100 hover:bg-indigo-50 shadow-sm transition" title="Add report">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Add Report</span>
              </button>
              {updatedAt && (
                <span className="text-xs bg-white/70 px-3 py-1 rounded-full border border-white shadow-sm">Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mt-6">
            <StatTile icon={<CalendarDays className="size-5" />} value={appointments.length} label="Appointments" tone="indigo" />
            <StatTile icon={<FileText className="size-5" />} value={reports.length} label="Reports" tone="emerald" />
            <StatTile icon={<Stethoscope className="size-5" />} value={doctors.length} label="Doctors" tone="purple" />
            <RiskTile label="Cardio Risk" value={risk.cardio} />
            <RiskTile label="Diabetes Risk" value={risk.diabetes} />
          </div>
        </div>
        {err && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">We hit a snag loading your data.</p>
              <p className="text-sm opacity-90">{err}</p>
            </div>
            <button onClick={fetchAll} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Retry</button>
          </div>
        )}
        <section className="mb-8">
          <SectionHeader title="Book a Doctor" />
          <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_10px_25px_rgba(17,24,39,0.04)]">
            <div className="mb-5">
              <div className="relative w-full sm:w-96">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or specialization…" className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
            ) : filteredDoctors.length === 0 ? (
              <EmptyState title="No doctors found" subtitle={search ? "Try a different search." : "Check back later."} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDoctors.map(d => (
                  <DoctorCard key={d._id || d.email || d.name} doc={d} onBook={() => openBooking(d)} />
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="mb-8">
          <SectionHeader title="Your Reports" />
          <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_10px_25px_rgba(17,24,39,0.04)]">
            {loading ? (
              <div className="space-y-2"><SkeletonLine /><SkeletonLine /><SkeletonLine /></div>
            ) : reports.length === 0 ? (
              <EmptyState title="No reports yet" subtitle="Add your first report so your doctor can review it." cta={{ label: "Add Report", onClick: manualOpenReport }} />
            ) : (
              <ul className="divide-y divide-gray-100">
                {reports.map(r => (
                  <li key={r._id || r.name} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 grid place-items-center">
                        <FileText className="size-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{r.title || r.name}</p>
                        <p className="text-xs text-gray-500">{r.date ? new Date(r.date).toLocaleDateString() : "No date"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">View</a>
                      )}
                      {r.url && (
                        <a href={r.url} download className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700">
                          <Download className="size-4" />
                          Download
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <section className="mb-12">
          <SectionHeader title="Upcoming Appointments" />
          <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_10px_25px_rgba(17,24,39,0.04)]">
            {loading ? (
              <div className="space-y-2"><SkeletonLine /><SkeletonLine /><SkeletonLine /></div>
            ) : appointments.length === 0 ? (
              <EmptyState title="No upcoming appointments" subtitle="Booked appointments will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-600">
                    <tr>
                      <th className="pb-2 pr-4">Doctor</th>
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Time</th>
                      <th className="pb-2 pr-4">Reason</th>
                      <th className="pb-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appointments.map((a, i) => (
                      <tr key={a._id || i}>
                        <td className="py-2 pr-4">{a.doctorName || a.doctor?.name || "—"}</td>
                        <td className="py-2 pr-4">{a.date ? new Date(a.date).toLocaleDateString() : "—"}</td>
                        <td className="py-2 pr-4">{a.time || "—"}</td>
                        <td className="py-2 pr-4">{a.reason || "—"}</td>
                        <td className="py-2 pr-4">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-200">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            {a.status || "Scheduled"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
      <AnimatePresence>
        {bookingOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setBookingOpen(false)} />
            <motion.div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <button className="absolute right-3 top-3 p-2 rounded-lg hover:bg-gray-100" onClick={() => setBookingOpen(false)} aria-label="Close booking">
                <X className="size-4" />
              </button>
              <h3 className="text-lg font-semibold mb-1">Book Appointment</h3>
              <p className="text-sm text-gray-600 mb-4">with <span className="font-medium">{selectedDoctor?.name}</span>{selectedDoctor?.specialization ? ` • ${selectedDoctor.specialization}` : ""}</p>
              <div className="space-y-3">
                <Field label="Date">
                  <input type="date" value={booking.date} onChange={e => setBooking(p => ({ ...p, date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </Field>
                <Field label="Time">
                  <input type="time" value={booking.time} onChange={e => setBooking(p => ({ ...p, time: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </Field>
                <Field label="Reason">
                  <textarea rows={3} value={booking.reason} onChange={e => setBooking(p => ({ ...p, reason: e.target.value }))} placeholder="Describe your symptoms or reason for visit" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </Field>
                {bookingMsg && <Flash msg={bookingMsg} ok={bookingMsg.startsWith("Booked")} />}
                <button onClick={submitBooking} disabled={bookingLoading} className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 font-semibold disabled:opacity-60">{bookingLoading ? "Booking…" : "Confirm Booking"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {reportOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setReportOpen(false)} />
            <motion.div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <button className="absolute right-3 top-3 p-2 rounded-lg hover:bg-gray-100" onClick={() => setReportOpen(false)} aria-label="Close report form">
                <X className="size-4" />
              </button>
              <h3 className="text-lg font-semibold mb-1">Add Report</h3>
              <p className="text-sm text-gray-600 mb-4">Upload a file or just add the details. Your doctor will be able to view it.</p>
              <div className="space-y-3">
                <Field label="Title *">
                  <input type="text" value={reportForm.title} onChange={e => setReportForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Blood Test - July" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </Field>
                <Field label="Date *">
                  <input type="date" value={reportForm.date} onChange={e => setReportForm(p => ({ ...p, date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </Field>
                <Field label="Description *">
                  <textarea rows={3} value={reportForm.description} onChange={e => setReportForm(p => ({ ...p, description: e.target.value }))} placeholder="Short summary or notes" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </Field>
                <Field label="File (optional)">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
                    <Upload className="size-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{reportForm.file ? reportForm.file.name : "Choose a file"}</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={e => setReportForm(p => ({ ...p, file: e.target.files?.[0] || null }))} />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PDF, Image, or Doc. Max ~10MB.</p>
                </Field>
                {reportMsg && <Flash msg={reportMsg} ok={reportMsg.toLowerCase().includes("success")} />}
                <button onClick={submitReport} disabled={reportLoading} className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 font-semibold disabled:opacity-60">{reportLoading ? "Saving…" : "Save Report"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {patientOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setPatientOpen(false)} />
            <motion.div className="relative w-full max-w-xl rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <button className="absolute right-3 top-3 p-2 rounded-lg hover:bg-gray-100" onClick={() => setPatientOpen(false)} aria-label="Close patient form">
                <X className="size-4" />
              </button>
              <h3 className="text-lg font-semibold mb-1">Add Your Health Details</h3>
              <p className="text-sm text-gray-600 mb-4">These help calculate your risk levels.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name *"><input value={patientForm.name} onChange={e => setPatientForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
                <Field label="Age *"><input type="number" value={patientForm.age} onChange={e => setPatientForm(p => ({ ...p, age: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
                <Field label="Gender"><select value={patientForm.gender} onChange={e => setPatientForm(p => ({ ...p, gender: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="1">Male</option><option value="0">Female</option></select></Field>
                <div className="hidden md:block" />
                <Field label="Heart Rate"><input type="number" value={patientForm.vitals.heartRate} onChange={e => setPatientForm(p => ({ ...p, vitals: { ...p.vitals, heartRate: e.target.value } }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
                <Field label="Systolic BP *"><input type="number" value={patientForm.vitals.bpSystolic} onChange={e => setPatientForm(p => ({ ...p, vitals: { ...p.vitals, bpSystolic: e.target.value } }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
                <Field label="Diastolic BP *"><input type="number" value={patientForm.vitals.bpDiastolic} onChange={e => setPatientForm(p => ({ ...p, vitals: { ...p.vitals, bpDiastolic: e.target.value } }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
                <Field label="BMI *"><input type="number" value={patientForm.vitals.bmi} onChange={e => setPatientForm(p => ({ ...p, vitals: { ...p.vitals, bmi: e.target.value } }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
                <Field label="HbA1c"><input value={patientForm.labs[0].value} onChange={e => setPatientForm(p => ({ ...p, labs: [{ ...p.labs[0], value: e.target.value }, p.labs[1]] }))} placeholder="%" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
                <Field label="HbA1c Date"><input type="date" value={patientForm.labs[0].date} onChange={e => setPatientForm(p => ({ ...p, labs: [{ ...p.labs[0], date: e.target.value }, p.labs[1]] }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
                <Field label="Triglycerides"><input value={patientForm.labs[1].value} onChange={e => setPatientForm(p => ({ ...p, labs: [p.labs[0], { ...p.labs[1], value: e.target.value }] }))} placeholder="mmol/L" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
                <Field label="Triglycerides Date"><input type="date" value={patientForm.labs[1].date} onChange={e => setPatientForm(p => ({ ...p, labs: [p.labs[0], { ...p.labs[1], date: e.target.value }] }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
              </div>
              {patientMsg && <div className="mt-3"><Flash msg={patientMsg} ok={patientMsg === "Saved"} /></div>}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => setPatientOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2.5">Close</button>
                <button onClick={submitPatient} disabled={patientLoading} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 font-semibold disabled:opacity-60">{patientLoading ? "Saving…" : "Save"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <button className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Activity className="size-3" />Top</button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Flash({ msg, ok }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg}</div>
  );
}

function toneClasses(t) {
  if (t === "indigo") return "from-indigo-50 border-indigo-100";
  if (t === "emerald") return "from-emerald-50 border-emerald-100";
  if (t === "purple") return "from-purple-50 border-purple-100";
  return "from-gray-50 border-gray-100";
}

function StatTile({ icon, value, label, tone }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${toneClasses(tone)} to-white/90 backdrop-blur-sm border shadow-[0_6px_16px_rgba(17,24,39,0.05)] p-5 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-white grid place-items-center text-indigo-600">{icon}</div>
        <div>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </div>
      <CalendarDays className="size-5 text-indigo-600" />
    </div>
  );
}

function RiskTile({ label, value }) {
  const tone = value === "High" ? "bg-red-50 text-red-700 border-red-200" : value === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <div className={`rounded-2xl border ${tone} p-5 flex items-center justify-between bg-white`}>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-2xl grid place-items-center ${value === "High" ? "bg-red-100" : value === "Medium" ? "bg-amber-100" : "bg-emerald-100"}`}>
          <Heart className="size-5" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DoctorCard({ doc, onBook }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 grid place-items-center">
            <Stethoscope className="size-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{doc.name}</h3>
            <p className="text-sm text-gray-600">{doc.specialization || "General"}</p>
            {doc.hospital && <p className="text-xs text-gray-500">{doc.hospital}</p>}
          </div>
        </div>
        <button onClick={onBook} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm font-medium">Book</button>
      </div>
      {doc.about && <p className="text-sm text-gray-600 mt-3">{doc.about}</p>}
      {Array.isArray(doc.tags) && doc.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {doc.tags.map((t, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, subtitle, cta }) {
  return (
    <div className="text-center py-10">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
        <FileText className="size-5 text-gray-500" />
      </div>
      <h4 className="text-gray-900 font-medium">{title}</h4>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      {cta && (
        <button onClick={cta.onClick} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-sm font-semibold">
          <Plus className="size-4" />
          {cta.label}
        </button>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

function SkeletonLine() {
  return <div className="h-10 w-full bg-gray-100 rounded-md animate-pulse" />;
}
