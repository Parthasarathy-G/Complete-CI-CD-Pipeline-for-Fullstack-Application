"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../utils/card"; // Adjust path if needed
import { Star } from "lucide-react";

// Sample testimonials data
const testimonials = [
  {
    name: "Dr. Sarah Johnson",
    role: "Clinic Director",
    clinic: "Sunrise Health Center",
    rating: 5,
    content:
      "ClinicPro has completely transformed how we manage patients and appointments. It's intuitive and powerful!",
  },
  {
    name: "Dr. Michael Lee",
    role: "Chief Medical Officer",
    clinic: "Evergreen Medical Group",
    rating: 4,
    content:
      "We’ve seen a 40% increase in operational efficiency since implementing ClinicPro. Highly recommended.",
  },
  {
    name: "Dr. Emily Carter",
    role: "Pediatrician",
    clinic: "Maplewood Children's Clinic",
    rating: 5,
    content:
      "The analytics dashboard gives us real-time insights we never had before. Absolutely essential.",
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] m-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
            Trusted by Healthcare Professionals
          </h2>
          <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            See how ClinicPro's advanced features are transforming clinics worldwide.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <CardDescription className="text-base italic text-gray-700 mb-4">
                    "{testimonial.content}"
                  </CardDescription>
                  <div className="text-left mt-4">
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-blue-600">{testimonial.clinic}</div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
