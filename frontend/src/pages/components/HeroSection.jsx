"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Building2,
  GraduationCap,
  Database,
} from "lucide-react";

import { Badge } from "../../utils/badge";
import { Button } from "../../utils/button";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 max-w-[1400px] m-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge
              variant="secondary"
              className="mb-4 inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 font-medium shadow-sm"
            >
              <Star className="w-4 h-4 mr-1 text-blue-600" />
              Trusted by 10,000+ Healthcare Professionals
            </Badge>

            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI-Driven Population{" "}
              </span>
              Health Risk Stratification Platform
            </h1>

            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Complete healthcare management solution with advanced department
              organization, training modules, analytics, and comprehensive
              workflow automation. Transform your clinic operations today.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="lg"
                className="text-lg px-8 py-6 text-white bg-black"
                variant="secondary"
              >
                Explore
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Link href="/signup" passHref>
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 w-full sm:w-auto border border-gray-400 text-gray-900 hover:bg-gray-50"
                >
                  Sign Up
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap mt-8 gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Real-time predictions
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Clinical decision
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Visualizations
              </div>
            </div>
          </motion.div>

          {/* Right Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 p-6 transition-transform duration-300 hover:scale-[1.01]">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 mb-6 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">
                    Advanced Dashboard
                  </h3>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition duration-300">
                    <div className="md:text-3xl font-bold text-blue-600 text-xl">
                      47
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Today's Appointments
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition duration-300">
                    <div className="md:text-3xl font-bold text-green-600 text-xl">
                      $12,450
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Weekly Revenue
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Cards */}
              <div className="space-y-4 divide-y divide-gray-200">
                <div className="flex items-center space-x-4 p-3 bg-gradient-to-r from-blue-50/50 to-transparent rounded-lg hover:bg-blue-100/50 transition">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-800">
                      6 Departments
                    </div>
                    <div className="text-sm text-gray-500">
                      Active with 47 staff members
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-3 bg-gradient-to-r from-green-50/50 to-transparent rounded-lg hover:bg-green-100/50 transition">
                  <GraduationCap className="h-8 w-8 text-green-600" />
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-800">
                      Training Center
                    </div>
                    <div className="text-sm text-gray-500">
                      85% completion rate
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-3 bg-gradient-to-r from-purple-50/50 to-transparent rounded-lg hover:bg-purple-100/50 transition">
                  <Database className="h-8 w-8 text-purple-600" />
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-800">
                      Analytics Ready
                    </div>
                    <div className="text-sm text-gray-500">
                      Real-time insights available
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
