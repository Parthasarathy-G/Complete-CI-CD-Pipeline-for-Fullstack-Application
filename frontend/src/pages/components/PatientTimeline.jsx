import React from "react";
import { motion } from "framer-motion";

export default function PatientTimeline({ timeline }) {
  if (!timeline?.length) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mt-8 mb-4">Patient Timeline</h2>
      <ol className="relative border-l-2 border-indigo-400">
        {timeline.map((event, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="mb-6 ml-4"
          >
            <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-1.5 top-1.5" />
            <p className="text-sm text-gray-500">
              {new Date(event.date).toLocaleDateString()}
            </p>
            <h3 className="text-md font-semibold text-gray-800">
              {event.type}: {event.title}
            </h3>
            {event.message && (
              <p className="text-sm text-gray-600">{event.message}</p>
            )}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
