import { motion } from "framer-motion";

export default function KPICard({ title, value, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition"
    >
      <div className="flex items-center space-x-4">
        {icon && <span className="text-3xl">{icon}</span>}
        <div>
          <h4 className="text-gray-500">{title}</h4>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}
