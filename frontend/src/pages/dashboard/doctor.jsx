// frontend/src/pages/dashboard/doctor.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import API, { getAuthHeaders } from "../../utils/api";
import DashboardLayout from "../components/DashboardLayout";
import AppointmentsTable from "../components/AppointmentsTable";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import {
  CalendarDays,
  Users2,
  Activity,
  TrendingUp,
  Building2,
  GraduationCap,
  BarChart3,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

function DoctorDashboard() {
  const [assignedCount, setAssignedCount] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [highRiskPatients, setHighRiskPatients] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const abortRef = useRef(null);

  // runtime headers to avoid stale token
  const headers = () => getAuthHeaders();

  // --- helpers for risk labels (based on your thresholds) ---
  const cardioLabel = (p) => {
    const ph = Number(p?.risk?.cardio?.probabilities?.High ?? 0);
    if (ph >= 0.20) return "High";
    if (ph >= 0.10) return "Moderate";
    return "Low";
  };
  const diabetesLabel = (p) => {
    const yes = Number(
      p?.risk?.diabetes?.probabilities?.Yes ??
        p?.risk?.diabetes?.probabilities?.Diabetes ??
        0
    );
    if (yes >= 0.30) return "High";
    if (yes >= 0.15) return "Moderate";
    return "Low";
  };

  const fetchAll = async () => {
    setErr("");
    setLoading(true);
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    const errs = [];
    const isCanceled = (e) => e?.name === "CanceledError" || e?.code === "ERR_CANCELED";
    let updated = false;

    try {
      // Assigned patients count
      try {
        const res = await API.get(`/dashboard/patients/count`, {
          headers: headers(),
          signal: controller.signal,
        });
        setAssignedCount(
          typeof res?.data === "number" ? res.data : (res?.data?.count ?? 0)
        );
        updated = true;
      } catch (e) {
        if (!isCanceled(e)) {
          errs.push(e?.response?.data?.message || e?.message || "Failed to load patient count.");
        }
      }

      // Today's appointments count
      try {
        const res = await API.get(`/dashboard/appointments/today`, {
          headers: headers(),
          signal: controller.signal,
        });
        setTodayAppointments(
          typeof res?.data === "number" ? res.data : (res?.data?.count ?? 0)
        );
        updated = true;
      } catch (e) {
        if (!isCanceled(e)) {
          errs.push(
            e?.response?.data?.message || e?.message || "Failed to load today's appointments."
          );
        }
      }

      // High-risk patients
      try {
        const res = await API.get(`/dashboard/patients/high-risk`, {
          headers: headers(),
          signal: controller.signal,
        });
        setHighRiskPatients(Array.isArray(res?.data) ? res.data : []);
        updated = true;
      } catch (e) {
        if (!isCanceled(e)) {
          errs.push(
            e?.response?.data?.message || e?.message || "Failed to load high-risk patients."
          );
        }
      }

      // Upcoming appointments
      try {
        const res = await API.get(`/dashboard/appointments/upcoming`, {
          headers: headers(),
          signal: controller.signal,
        });
        setUpcomingAppointments(Array.isArray(res?.data) ? res.data : []);
        updated = true;
      } catch (e) {
        if (!isCanceled(e)) {
          errs.push(
            e?.response?.data?.message || e?.message || "Failed to load upcoming appointments."
          );
        }
      }

      if (errs.length > 0) setErr(errs.join(" "));
      if (updated) setUpdatedAt(new Date());
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
        setErr(e?.response?.data?.message || e?.message || "Failed to load dashboard.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    return () => abortRef.current?.abort?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return upcomingAppointments;
    return upcomingAppointments.filter((a) => {
      const patientText =
        typeof a?.patient === "string"
          ? a.patient
          : (a?.patient?.name || a?.patientName || "");
      const haystack = [
        patientText,
        a?.notes,
        a?.reason,
        a?.status,
        a?.date,
        a?.time,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [upcomingAppointments, search]);

  return (
    <div className={`${geistSans.variable} ${geistMono.variable}`}>
      {/* TOP HERO */}
      <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[#f6f7ff] via-white to-[#f7efff] border border-white/60 shadow-[0_10px_30px_rgba(87,70,175,0.08)] mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Advanced Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">
              {updatedAt
                ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Loading…"}
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-indigo-700 border border-indigo-100 hover:bg-indigo-50 shadow-sm transition active:scale-[0.98]"
            title="Refresh"
          >
            <RefreshCw className="size-4" />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <StatTile
            icon={<CalendarDays className="size-5 text-indigo-600" />}
            value={todayAppointments}
            label="Today's Appointments"
          />
          <StatTile
            icon={<ShieldAlert className="size-5 text-green-600" />}
            value={highRiskPatients.length}
            label="High-Risk Alerts"
            green
          />
        </div>

        {/* ICON LIST */}
        <div className="space-y-3">
          <IconRow
            icon={<Building2 className="size-5 text-indigo-600" />}
            title="Assigned Patients"
            subtitle={`You currently manage ${assignedCount} patients`}
          />
          <IconRow
            icon={<GraduationCap className="size-5 text-emerald-600" />}
            title="Today’s Load"
            subtitle={`${todayAppointments} appointment${todayAppointments === 1 ? "" : "s"} scheduled today`}
          />
          <IconRow
            icon={<BarChart3 className="size-5 text-purple-600" />}
            title="Analytics Ready"
            subtitle="Real-time risk insights available"
            last
          />
        </div>
      </div>

      {/* ERROR */}
      {err && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">We hit a snag loading your data.</p>
            <p className="text-sm opacity-90">{err}</p>
          </div>
          <button
            onClick={fetchAll}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* HIGH RISK LIST */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_10px_25px_rgba(17,24,39,0.04)] mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="size-5 text-rose-600" />
            High Risk Patients
          </h3>
          <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
            {highRiskPatients.length} alert{highRiskPatients.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonLine />
            <SkeletonLine />
            <SkeletonLine />
          </div>
        ) : highRiskPatients.length === 0 ? (
          <EmptyState title="No high-risk alerts 🎉" subtitle="All good right now." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {highRiskPatients.map((p, i) => (
              <li key={p._id || i} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center">
                    <Users2 className="size-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      Cardio: {cardioLabel(p)} • Diabetes: {diabetesLabel(p)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/doctor/patient/${p._id}`}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* UPCOMING APPOINTMENTS */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_10px_25px_rgba(17,24,39,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="size-5 text-indigo-600" />
            Upcoming Appointments
          </h3>

          <div className="relative w-64 max-w-full">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, notes, status…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {loading ? (
          <SkeletonTable />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            title="No upcoming appointments"
            subtitle={search ? "Try a different search." : "You’re all set."}
          />
        ) : (
          <AppointmentsTable appointments={filteredAppointments} />
        )}
      </div>
    </div>
  );
}

/* ------- Subcomponents ------- */

function StatTile({ icon, value, label, green }) {
  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-100 shadow-[0_6px_16px_rgba(17,24,39,0.05)] p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${green ? "bg-emerald-50" : "bg-indigo-50"}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </div>
      <TrendingUp className={`size-5 ${green ? "text-emerald-600" : "text-indigo-600"}`} />
    </div>
  );
}

function IconRow({ icon, title, subtitle, last = false }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${last ? "" : "border-b border-white/60"}`}>
      <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-white/80">
        {icon}
      </div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="text-center py-10">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
        <BarChart3 className="size-5 text-gray-500" />
      </div>
      <h4 className="text-gray-900 font-medium">{title}</h4>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function SkeletonLine() {
  return <div className="h-12 w-full bg-gray-100 rounded-xl animate-pulse" />;
}

function SkeletonTable() {
  return (
    <div className="space-y-2">
      <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
      <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
      <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
      <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
    </div>
  );
}

DoctorDashboard.getLayout = function getLayout(page) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default DoctorDashboard;
