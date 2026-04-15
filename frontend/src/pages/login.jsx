import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router"; // keep this if you're on pages router
import { loginUser } from "../utils/api";
import { motion } from "framer-motion";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const ROLES = ["doctor", "patient"];

const emailRegex =
  // simple but practical; avoid over-validating
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LoginPage = () => {
  const router = useRouter();
  const [role, setRole] = useState("doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  // If already logged in, bounce to dashboard
  useEffect(() => {
    try {
      const token =
        typeof window !== "undefined" && localStorage.getItem("token");
      if (token) {
        router.replace(`/dashboard/${role}`);
      }
    } catch {
      // ignore storage errors
    }
  }, [role, router]);

  const canSubmit = useMemo(() => {
    return emailRegex.test(email) && password.length >= 6 && !loading;
  }, [email, password, loading]);

  const validate = () => {
    const errs = { email: "", password: "" };
    if (!email) errs.email = "Email is required.";
    else if (!emailRegex.test(email)) errs.email = "Enter a valid email.";
    if (!password) errs.password = "Password is required.";
    else if (password.length < 6)
      errs.password = "Password must be at least 6 characters.";
    setFieldErrors(errs);
    return !errs.email && !errs.password;
  };

  const handleLogin = async () => {
    setError("");
    if (!validate()) return;
    setLoading(true);

    try {
  // Normal API login for doctors or patients
      const res = await loginUser(role, { email, password });

      const token = res?.data?.token || res?.token;
      if (!token) throw new Error("Token missing in response");

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("token", token);
      (remember ? sessionStorage : localStorage).removeItem("token");

      router.push(`/dashboard/${role}`);
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed. Please try again.";
      setError(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Welcome back
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Log in to access your {role} dashboard
        </p>

        {/* Role Switcher */}
        <div className="flex items-center justify-center gap-2 mb-6" role="tablist" aria-label="Select role">
          {ROLES.map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                role="tab"
                aria-selected={active}
                onClick={() => setRole(r)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${active
                    ? "bg-blue-600 text-white focus:ring-blue-600"
                    : "bg-gray-200 text-gray-700 hover:bg-blue-100 focus:ring-blue-300"
                  }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Email */}
        <div className="space-y-1 mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.email ? "border-red-400" : "border-gray-300"
              }`}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email && (
            <p id="email-error" className="text-sm text-red-600">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1 mb-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyDown}
              className={`w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.password ? "border-red-400" : "border-gray-300"
                }`}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="password-error" className="text-sm text-red-600">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Remember & Forgot */}
        <div className="flex items-center justify-between mb-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Remember me
          </label>

          <a
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot password?
          </a>
        </div>

        {/* API / form error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
            role="alert"
          >
            {error}
          </motion.div>
        )}

        {/* Submit */}
        <motion.button
          whileHover={{ scale: canSubmit ? 1.02 : 1 }}
          whileTap={{ scale: canSubmit ? 0.98 : 1 }}
          onClick={handleLogin}
          disabled={!canSubmit}
          className={`mt-2 w-full py-3 rounded-lg text-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${canSubmit
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl focus:ring-blue-600"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Logging in…
            </span>
          ) : (
            "Log In"
          )}
        </motion.button>

        {/* Sign up */}
        <p className="mt-6 text-center text-gray-600">
          Don’t have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>

        {/* Small print */}
        <p className="mt-3 text-center text-xs text-gray-500">
          By logging in, you agree to our{" "}
          <a className="underline hover:text-gray-700" href="/terms">
            Terms
          </a>{" "}
          and{" "}
          <a className="underline hover:text-gray-700" href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </motion.div>
    </section>
  );
};

export default LoginPage;
