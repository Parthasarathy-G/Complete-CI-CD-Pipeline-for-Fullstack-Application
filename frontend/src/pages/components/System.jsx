"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Server,
  Cloud,
  Lock,
} from "lucide-react"; // Example icons
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../utils/card";

const systemFeatures = [
  {
    icon: ShieldCheck,
    title: "Security First",
    description:
      "Enterprise-grade security with end-to-end encryption and role-based access control.",
  },
  {
    icon: Server,
    title: "Scalable Infrastructure",
    description:
      "Built to scale effortlessly as your organization grows without compromising performance.",
  },
  {
    icon: Cloud,
    title: "Cloud Native",
    description:
      "Deployed on highly available cloud architecture with automatic failover.",
  },
  {
    icon: Lock,
    title: "Data Privacy",
    description:
      "Compliant with GDPR, HIPAA, and other leading data privacy regulations.",
  },
];

export default function EnterpriseFeatures() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
            Enterprise-Grade System Features
          </h2>
          <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            Built with security, scalability, and reliability at its core.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[1400px] m-auto">
          {systemFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full text-center bg-white/70 backdrop-blur-lg border border-gray-200 rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <feature.icon className="h-7 w-7 text-green-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold mb-2 text-gray-800">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

