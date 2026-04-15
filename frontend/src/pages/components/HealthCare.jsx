"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "../../utils/button";
import { Heart } from "lucide-react";

const HealthCare = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Ready to Transform Your Clinic?
          </h2>
          <p className="text-lg lg:text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of healthcare professionals already using ClinicPro
            to streamline operations and elevate patient care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100"
            >
              Login
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Link href="/signup" passHref>
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-6 bg-black border-black text-white hover:bg-white hover:text-blue-600 transition-colors duration-300"
              >
                Sign Up
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HealthCare;
