"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LogOut,
  Home,
  Users2,
  CalendarDays,
  ShieldAlert,
  Heart,
} from "lucide-react";
import axios from "axios";

/** ---- Config ---- */
const NAV = [
  { label: "Dashboard", href: "/dashboard/doctor", icon: Home },
  { label: "Patients", href: "/dashboard/doctor/patients", icon: Users2 },
  { label: "Appointments", href: "/dashboard/doctor/appointments", icon: CalendarDays },
  { label: "Risk Predictor", href: "/dashboard/doctor/risk-predictor", icon: ShieldAlert },
];

const DESKTOP_OPEN_W = 280;
const DESKTOP_COLLAPSED_W = 88;

/** ---- Axios instance ---- */
const API = axios.create({
  baseURL:
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
    "https://med2-vgw1.onrender.com/api",
  timeout: 15000,
});

/** ---- Helper: clear auth everywhere ---- */
const hardClearAuth = () => {
  try {
    // storage
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("refreshToken");

    // cookies
    document.cookie = "token=; Max-Age=0; path=/";
    document.cookie = "refreshToken=; Max-Age=0; path=/";

    // axios defaults
    if (API.defaults.headers?.Authorization) delete API.defaults.headers.Authorization;
    if (API.defaults.headers?.authorization) delete API.defaults.headers.authorization;

    // notify other tabs
    try {
      const bc = new BroadcastChannel("auth");
      bc.postMessage({ type: "logout" });
      bc.close();
    } catch {}
  } catch {}
};

export default function Sidebar() {
  const router = useRouter();
  const [openDesktop, setOpenDesktop] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);

  // load/save desktop collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sb_open");
      if (saved != null) setOpenDesktop(saved === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("sb_open", openDesktop ? "1" : "0");
    } catch {}
  }, [openDesktop]);

  // close mobile on route change
  useEffect(() => {
    const close = () => setOpenMobile(false);
    router.events.on("routeChangeComplete", close);
    return () => router.events.off("routeChangeComplete", close);
  }, [router.events]);

  // listen for cross-tab logout
  useEffect(() => {
    let bc = null;
    try {
      bc = new BroadcastChannel("auth");
      bc.onmessage = (e) => {
        if (e?.data?.type === "logout") router.replace("/login");
      };
    } catch {}
    return () => {
      try {
        bc && bc.close();
      } catch {}
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout").catch(() => {});
    } finally {
      hardClearAuth();
      router.replace("/login");
    }
  };

  /** Nav links */
  const NavLinks = useMemo(
    () => (
      <ul className="px-2 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = router.pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  openDesktop
                    ? "grid grid-cols-[44px_1fr]"
                    : "grid grid-cols-1 justify-items-center",
                  "items-center gap-3 rounded-2xl px-2 py-2.5 mb-1.5",
                  "transition-colors select-none",
                  active
                    ? "bg-indigo-600 text-white shadow-sm border border-indigo-500/60"
                    : "bg-white/90 text-gray-800 hover:bg-indigo-50 border border-gray-200",
                ].join(" ")}
                title={label}
              >
                <span
                  className={[
                    "h-11 w-11 rounded-xl grid place-items-center",
                    openDesktop ? "" : "mx-auto",
                    active ? "bg-white/20" : "bg-gray-100 hover:bg-indigo-100",
                  ].join(" ")}
                >
                  <Icon className={active ? "h-5 w-5 text-white" : "h-5 w-5 text-gray-700"} />
                </span>

                <AnimatePresence initial={false}>
                  {openDesktop && (
                    <motion.span
                      className="text-[0.95rem] font-medium leading-none truncate"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18 }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </li>
          );
        })}
      </ul>
    ),
    [router.pathname, openDesktop]
  );

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setOpenMobile(true)}
            className="p-2 rounded-xl hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="h-7 w-7 text-indigo-600" />
            <span className="font-semibold">ClinicPro</span>
          </div>
          <div className="h-6 w-6" />
        </div>
      </div>

      {/* DESKTOP RAIL */}
      <motion.aside
        initial={false}
        animate={{ width: openDesktop ? DESKTOP_OPEN_W : DESKTOP_COLLAPSED_W }}
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 z-30"
        style={{ willChange: "width" }}
      >
        <div className="m-4 flex-1 rounded-[24px] border border-white/70 bg-gradient-to-br from-[#f6f8ff] via-white to-[#f7efff] shadow-[0_12px_40px_rgba(87,70,175,0.10)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/70 bg-white/50 backdrop-blur">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-indigo-600" />
              {openDesktop && (
                <span className="text-lg font-semibold text-gray-900">ClinicPro</span>
              )}
            </div>
          </div>

          {openDesktop && (
            <div className="px-4 pt-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs text-gray-600 shadow-sm">
                <span className="text-indigo-600">★</span>
                Trusted by 10,000+ Healthcare Professionals
              </div>
            </div>
          )}

          <nav className="p-3 overflow-y-auto">{NavLinks}</nav>

          {/* Footer */}
          <div className="mt-auto px-4 pb-4 pt-2 border-t border-white/70 bg-white/40">
            <button
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2.5 font-medium shadow-sm transition"
            >
              <LogOut className="h-4 w-4" />
              {openDesktop && <span>Logout</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {openMobile && (
          <>
            <motion.div
              key="drawer"
              initial={{ x: -340 }}
              animate={{ x: 0 }}
              exit={{ x: -340 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[86%] max-w-[340px] md:hidden p-4"
            >
              <div className="h-full rounded-[24px] border border-white/70 bg-gradient-to-br from-[#f6f8ff] via-white to-[#f7efff] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/70 bg-white/50 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <Heart className="h-8 w-8 text-indigo-600" />
                    <span className="text-lg font-semibold text-gray-900">ClinicPro</span>
                  </div>
                  <button
                    onClick={() => setOpenMobile(false)}
                    className="p-2 rounded-xl hover:bg-white/70"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5 text-gray-700" />
                  </button>
                </div>
                <nav className="p-3 overflow-y-auto">{NavLinks}</nav>
                <div className="mt-auto px-4 pb-4 pt-2 border-t border-white/70 bg-white/40">
                  <button
                    onClick={handleLogout}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-2.5 font-medium shadow-sm transition"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Backdrop */}
            <motion.button
              key="backdrop"
              onClick={() => setOpenMobile(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              aria-label="Close menu backdrop"
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
