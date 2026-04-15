"use client";
import { motion } from "framer-motion";

// If you use TypeScript, see the TS version below.
export default function AppointmentsTable({ appointments = [] }) {
  const rows = Array.isArray(appointments) ? appointments : [];

  return (
    <div className="overflow-x-auto rounded-lg shadow-lg bg-white">
      <table className="min-w-full table-auto md:table-fixed">
        <thead>
          <tr className="bg-blue-50 text-gray-700 uppercase text-sm">
            <th className="px-6 py-3 text-center">Patient</th>
            <th className="px-6 py-3 text-center">Date</th>
            <th className="px-6 py-3 text-center">Time</th>
            <th className="px-6 py-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="border-b bg-white">
              <td className="px-6 py-6 text-center text-gray-500" colSpan={4}>
                No appointments yet.
              </td>
            </tr>
          ) : (
            rows.map((a, idx) => (
              <motion.tr
                key={a?.id ?? idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ backgroundColor: "#f9fafb" }}
                className={`border-b ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              >
                <td className="px-6 py-4 text-center font-medium text-gray-800">
                  {a?.patient ?? "—"}
                </td>
                <td className="px-6 py-4 text-center text-gray-700">{a?.date ?? "—"}</td>
                <td className="px-6 py-4 text-center text-gray-700">{a?.time ?? "—"}</td>
                <td
                  className={`px-6 py-4 text-center font-semibold ${
                    a?.status === "Confirmed"
                      ? "text-green-600"
                      : a?.status === "Pending"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {a?.status ?? "Unknown"}
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
