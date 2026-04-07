// frontend/src/pages/dashboard/doctor/appointments.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import API, { getAuthHeaders } from "../../../utils/api";
import { format, endOfMonth, startOfToday, isSameDay, isBefore } from "date-fns";
import { Calendar } from "react-date-range";
import { motion } from "framer-motion";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import DashboardLayout from "../../components/DashboardLayout";
import Loader from "../../components/Loader";

// ----- CONFIG: fixed UI time slots (labels) -----
const timeSlots = [
  "09:00 AM","09:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","02:00 PM","02:30 PM","03:00 PM","03:30 PM",
  "04:00 PM","04:30 PM","05:00 PM",
];

// ----- HELPERS -----
const ymdLocal = (d) => {
  // timezone-safe YYYY-MM-DD from local calendar parts
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toLabel = (hhmm24) => {
  if (!hhmm24) return "";
  const [hStr, mStr] = hhmm24.split(":");
  let h = Number(hStr), m = Number(mStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

const to24h = (label) => {
  const [time, ampm] = label.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

const isSlotInPastForToday = (slotLabel) => {
  // must be strictly after current time (no picking at or before now)
  const slot24 = to24h(slotLabel);
  return slot24 <= nowHHMM();
};

// ----- COMPONENT -----
const DoctorAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => startOfToday(), []);
  const monthEnd = useMemo(() => endOfMonth(new Date()), []);

  const [selectedDate, setSelectedDate] = useState(today);
  const selectedYMD = useMemo(() => ymdLocal(selectedDate), [selectedDate]);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);

  const [dateSettled, setDateSettled] = useState(true); // guard against saving too fast after date change

  // ---- Fetch doctor's upcoming appointments (for booked slots) ----
 const fetchAppointments = async () => {
  setLoading(true);
  try {
    // CHANGED: /dashboard/appointments/upcoming -> /appointment/upcoming
    const res = await API.get("/appointment/upcoming", {
      headers: getAuthHeaders(),
    });

    const appts = Array.isArray(res.data?.appointments) ? res.data.appointments : [];
    setAppointments(appts);

    const bookedForDay = appts
      .filter((a) => a.date === selectedYMD)
      .map((a) => toLabel(a.time));
    setBookedSlots(bookedForDay);
  } catch (e) {
    console.error("Failed to fetch appointments", e?.response?.data || e);
    // Optional: show backend message if present
    // alert(e?.response?.data?.message || "Failed to fetch appointments");
    setAppointments([]);
    setBookedSlots([]);
  } finally {
    setLoading(false);
  }
};

  // ---- Fetch per-day availability ----
  const fetchAvailability = async (dateObj) => {
    try {
      const res = await API.get("/availability", {
        headers: getAuthHeaders(),
        params: { date: ymdLocal(dateObj) },
      });
      const slots = Array.isArray(res.data?.slots) ? res.data.slots : [];
      setAvailableSlots(slots.map(toLabel));
    } catch (e) {
      console.error("Failed to fetch availability", e);
      setAvailableSlots([]);
    }
  };

  // ---- Limit selectable dates to today..endOfMonth ----
  const handleDateChange = (d) => {
    if (isBefore(d, today)) return;       // block past dates
    if (isBefore(monthEnd, d)) return;    // block beyond this month
    setDateSettled(false);
    setSelectedDate(d);
    // allow state to settle before enabling Save (prevents off-by-one sends)
    setTimeout(() => setDateSettled(true), 150);
  };

  const toggleSlot = (slot) => {
    setAvailableSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  // ---- Save per-day availability (no recurring) ----
 const saveAvailability = async () => {
  try {
    const payload = {
      date: selectedYMD,
      slots: availableSlots
        .map(to24h)
        .filter((s) => !isSameDay(selectedDate, today) || s > nowHHMM()),
    };
    const res = await API.post("/availability", payload, { headers: getAuthHeaders() });
    if (res.status < 300) {
      alert(`Availability saved for ${selectedYMD}.`);
      await fetchAvailability(selectedDate); // refresh canonical
    } else {
      alert(res.data?.message || "Unexpected status saving availability.");
    }
  } catch (e) {
    // show the backend message in the alert/console
    const msg = e?.response?.data?.message || e.message || "Failed to save availability.";
    console.error("saveAvailability error:", e?.response?.data || e);
    alert(msg);
  }
};


  useEffect(() => {
    fetchAppointments();
    fetchAvailability(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  if (loading) return <Loader />;

  const isTodaySelected = isSameDay(selectedDate, today);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="p-6 space-y-10"
    >
      {/* Appointments Table */}
      <div className="bg-white shadow-md rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-4">My Appointments</h1>
        <table className="w-full table-auto text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Patient</th>
              <th className="p-3">Date</th>
              <th className="p-3">Time</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt, i) => (
              <tr key={appt._id} className="border-b hover:bg-gray-50">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{appt.patient?.name || "-"}</td>
                <td className="p-3">{appt.date}</td>
                <td className="p-3">{toLabel(appt.time)}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-sm font-medium ${
                      (appt.status || "scheduled").toLowerCase() === "completed"
                        ? "bg-green-100 text-green-700"
                        : (appt.status || "scheduled").toLowerCase() === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {["scheduled","completed","cancelled"].includes((appt.status||"").toLowerCase())
                      ? (appt.status[0].toUpperCase()+appt.status.slice(1))
                      : "Scheduled"}
                  </span>
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={5}>
                  No upcoming appointments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Availability Calendar */}
      <div className="bg-white rounded-2xl p-6 shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Set Your Availability</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <Calendar
            date={selectedDate}
            onChange={handleDateChange}
            color="#6a58c6"
            minDate={today}
            maxDate={monthEnd}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">
                Time Slots for {format(selectedDate, "dd MMM yyyy")}
              </h3>
              <span className="text-xs text-gray-500">
                Only {format(today, "MMM")} {format(today, "yyyy")} is selectable
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {timeSlots.map((slot) => {
                const isBooked = bookedSlots.includes(slot);
                const isPastToday = isTodaySelected && isSlotInPastForToday(slot);
                const disabled = isBooked || isPastToday;
                const isSelected = !disabled && availableSlots.includes(slot);

                return (
                  <button
                    key={slot}
                    onClick={() => !disabled && toggleSlot(slot)}
                    disabled={disabled}
                    className={`rounded-lg px-4 py-2 border text-sm transition font-medium
                      ${
                        disabled
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                          : isSelected
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                  >
                    {slot}
                    {isBooked ? " (Booked)" : isPastToday ? " (Past)" : ""}
                  </button>
                );
              })}
            </div>

            <button
              onClick={saveAvailability}
              disabled={!dateSettled}
              className={`mt-4 px-6 py-2 rounded-xl transition ${
                dateSettled
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Save Availability
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

DoctorAppointmentsPage.getLayout = function getLayout(page) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default DoctorAppointmentsPage;
