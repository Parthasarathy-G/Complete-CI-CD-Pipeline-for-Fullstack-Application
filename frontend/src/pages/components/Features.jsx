import React from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  DollarSign,
  TestTube2,
  Building2,
  UserCheck,
  Activity,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../utils/card";

const Features = () => {
  const coreFeatures = [
    {
      icon: Calendar,
      title: "Smart Appointment System",
      description:
        "Advanced scheduling with automated reminders, conflict detection, and calendar integration.",
    },
    {
      icon: Users,
      title: "Complete Patient Management",
      description:
        "Comprehensive patient records, medical history, allergies, and treatment tracking.",
    },
    {
      icon: TestTube2,
      title: "Laboratory Integration",
      description:
        "Complete test management with external lab vendor integration and result tracking",
      highlight: "Lab Vendors",
    },
    {
      icon: Building2,
      title: "Department Management",
      description:
        "Organize staff by departments with budget tracking and location management.",
    },
    {
      icon: UserCheck,
      title: "Staff & Role Management",
      description:
        "Complete staff management with role-based access control and scheduling.",
    },
    {
      icon: Activity,
      title: "Services Management",
      description:
        "Medical services catalog with pricing, scheduling, and department assignments.",
    },
  ];

  return (
    <section
      id="features"
      className="py-20 bg-gradient-to-b from-white to-blue-50  mx-auto"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
            🚀 Core Platform Features
          </h2>
          <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            Power your clinic with a modern, scalable, and intelligent management platform.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {coreFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="group relative h-full bg-white/70 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <div className="relative w-14 h-14 mb-5 rounded-xl bg-gradient-to-tr from-blue-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-7 w-7 text-blue-600 group-hover:text-purple-600 transition-colors duration-300" />
                  </div>
                  <CardTitle className="text-xl lg:text-2xl font-semibold mb-2 text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600 leading-relaxed">
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
};

export default Features;
