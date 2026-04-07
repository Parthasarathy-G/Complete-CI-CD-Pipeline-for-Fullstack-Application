import { motion } from "framer-motion";
import Link from "next/link";

export default function PatientAlert({ name, risk, _id }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex justify-between items-center bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
    >
      <span>{name}</span>
      <span className="text-red-600 font-semibold">{risk}</span>
      <Link
        href={`/dashboard/doctor/patient/${_id}`}
        className="text-blue-600 hover:underline text-sm"
      >
        View Report →
      </Link>
    </motion.div>
  );
}
