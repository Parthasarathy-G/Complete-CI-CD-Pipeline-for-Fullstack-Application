"use client";

import React from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../utils/card";
import { Button } from "../../utils/button";
import { Input } from "../../utils/input";
import { Textarea } from "../../utils/textarea";

const Contact = () => {
  return (
    <section
      id="contact"
      className="relative py-24 bg-gradient-to-b from-white to-gray-50"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] m-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Info Block */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <div className="flex flex-col ">
            <h2 className="text-4xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              ✨ Experience ClinicPro Today
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 mb-10 max-w-xl">
              Get in touch to schedule a personalized demo and explore how
              ClinicPro’s advanced tools can streamline your clinic’s workflow.
            </p>
            
            <div className="py-12 space-y-6">
              <div className="flex items-center gap-4">
                <Phone className="h-6 w-6 text-blue-600" />
                <span className="text-gray-800 font-medium text-lg">
                  +64 27 381 0361
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="h-6 w-6 text-blue-600" />
                <span className="text-gray-800 font-medium text-lg">
                  Aakaashcharleswork@gmail.com
                </span>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="h-6 w-6 text-blue-600" />
                <span className="text-gray-800 font-medium text-lg">
                  Hamilton, Waikato
                </span>
              </div>
            </div>
            </div>
          </motion.div>

          {/* Right Form Block */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <Card className="bg-white/80 backdrop-blur-2xl border border-gray-200 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500">
              <CardHeader>
                <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900">
                Sign In Now
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  Fill out this form and our team will get back to you within 24
                  hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="First Name"
                      className="bg-white/70 border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <Input
                      placeholder="Last Name"
                      className="bg-white/70 border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Input
                    placeholder="Email Address"
                    type="email"
                    className="bg-white/70 border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <Input
                    placeholder="Phone Number"
                    type="tel"
                    className="bg-white/70 border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <Input
                    placeholder="Clinic Name"
                    className="bg-white/70 border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <Textarea
                    placeholder="Tell us about your clinic and which features interest you most..."
                    rows={4}
                    className="bg-white/70 border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Sign in
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
