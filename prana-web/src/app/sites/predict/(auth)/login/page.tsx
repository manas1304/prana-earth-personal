"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Leaf } from "lucide-react";
// --- CHANGED: Added necessary imports for routing and backend actions ---
import { useRouter } from "next/navigation";
import { login, register, loginWithGoogle } from "@/actions/auth.actions";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
// -----------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter(); // --- CHANGED: Initialize router for redirection

  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const defaultTab = searchParams.get("tab") || "login";

  const [tab, setTab] = useState("login");

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const [isLoading, setIsLoading] = useState(false); // --- CHANGED: Added loading state

  // --- CHANGED: Added specific state for the login form ---
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  // --------------------------------------------------------

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    company: "",
    jobTitle: "",
    country: "",
    agreed: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState(""); // --- CHANGED: For general API errors

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim()) e.fullName = "Full name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = "Valid email is required";
    if (formData.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (!/^\+?[0-9]{7,15}$/.test(formData.phone))
      e.phone = "Valid phone number is required";
    if (!formData.company.trim())
      e.company = "Company/Organization is required";
    if (!formData.jobTitle.trim()) e.jobTitle = "Job title is required";
    if (!formData.country.trim()) e.country = "Country/Region is required";
    if (!formData.agreed) e.agreed = "You must agree to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const performRedirect = (targetUrl: string, loginResponse: any) => {
    try {
      const absoluteTargetUrl = new URL(targetUrl, window.location.href).toString();
      const redirectUrlObj = new URL(absoluteTargetUrl);
      const currentUrlObj = new URL(window.location.href);

      // Determine the "other" host/origin to sync tokens to
      let otherOrigin: string | null = null;
      if (currentUrlObj.hostname.startsWith("marketplace.")) {
        const parentHostname = currentUrlObj.hostname.replace("marketplace.", "");
        otherOrigin = `${currentUrlObj.protocol}//${parentHostname}${currentUrlObj.port ? `:${currentUrlObj.port}` : ""}`;
      } else {
        const portPart = currentUrlObj.port ? `:${currentUrlObj.port}` : "";
        otherOrigin = `${currentUrlObj.protocol}//marketplace.${currentUrlObj.hostname}${portPart}`;
      }

      const resData = loginResponse?.data;
      const accessToken = resData?.accessToken;
      const refreshToken = resData?.refreshToken;

      if (otherOrigin && accessToken && refreshToken) {
        const callbackUrl = new URL("/api/auth/set-tokens", otherOrigin);
        callbackUrl.searchParams.set("accessToken", accessToken);
        callbackUrl.searchParams.set("refreshToken", refreshToken);
        callbackUrl.searchParams.set("redirectTo", absoluteTargetUrl);
        
        window.location.replace(callbackUrl.toString());
        return;
      }
    } catch (e) {
      // Fallback
    }
    window.location.replace(targetUrl);
  };

  // --- CHANGED: Implemented Login Logic connecting to auth.actions.ts ---
  const handleLogin = async () => {
    setErrors({});
    setGlobalError("");

    if (!loginData.email || !loginData.password) {
      toast.error("Please enter both email and password."); // Added toast
      setGlobalError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await login({
        email: loginData.email,
        password: loginData.password,
      });

      if (response.success) {
        sessionStorage.setItem("loginSuccess", "true");
        performRedirect(redirectTo, response);
      } else {
        const res = response as any;

        if (res.errors && res.errors.length > 0) {
          const apiErrors: Record<string, string> = {};
          res.errors.forEach((err: any) => {
            apiErrors[err.field] = err.message;
          });
          setErrors(apiErrors);
          toast.error("Please check the form for errors."); // Added toast
        } else {
          const message = response.message || "Operation failed.";
          setGlobalError(message);
          toast.error(message); // Added toast
        }
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred. Please try again."); // Added toast
      setGlobalError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  // ----------------------------------------------------------------------

  // --- CHANGED: Implemented Register Logic connecting to auth.actions.ts ---
  const handleRegister = async () => {
    if (!validate()) return;

    setErrors({});
    setGlobalError("");
    setIsLoading(true);

    try {
      // Mapping frontend state to backend requirements (including confirmPassword)
      const response = await register({
        ...formData,
        confirmPassword: formData.password,
      });

      if (response.success) {
        // Successful registration: Redirect to marketplace home.
        const loginRes = await login({ email: formData.email, password: formData.password });
        toast.success("Account created! Welcome to Prana Earth 🌱");
        setTimeout(() => {
          performRedirect(redirectTo, loginRes);
        }, 1500);
      } else {
        // Cast to 'any' to bypass strict TS checking for the errors array
        const res = response as any;

        if (res.errors && res.errors.length > 0) {
          const apiErrors: Record<string, string> = {};
          res.errors.forEach((err: any) => {
            apiErrors[err.field] = err.message;
          });
          setErrors(apiErrors);
        } else {
          setGlobalError(response.message || "Operation failed.");
        }
      }
    } catch (err: any) {
      setGlobalError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  // ----------------------------------------------------------------------

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setGlobalError("");

    try {
      // credentialResponse.credential is the actual secure JWT idToken
      const response = await loginWithGoogle({
        idToken: credentialResponse.credential,
      });

      if (response.success) {
        performRedirect(redirectTo, response);
      } else {
        setGlobalError(response.message || "Google login failed.");
      }
    } catch (err: any) {
      setGlobalError("An unexpected error occurred during Google login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <div className="h-screen flex flex-col">
        {/* Mobile Logo - Only visible on small screens */}
        <Link
          href="/"
          className="md:hidden flex items-center justify-center gap-2 mb-0 mt-10"
        >
          <Image
            src="/prana-earth-logo-optimized.webp"
            alt="Prana Earth Logo"
            width={28}
            height={28}
          />
          <span className="text-[#1a82c4]">Prana </span>
          <span className="text-[#16a34a]">Earth</span>
        </Link>
        <div className="flex flex-1 h-screen">
          {/* Left image panel */}
          <div className="relative w-[85%] hidden md:block">
            <Image
              src="/login-bg-new.png"
              alt="Prana Earth"
              fill
              className="object-cover"
            />
            {/* <div className="absolute inset-0 bg-white/70" /> */}
            <Link href="/">
              <div className="absolute top-6 left-6 flex items-center gap-2 text-black font-bold text-sm tracking-wide">
                <Image
                  src="/prana-earth-logo-optimized.webp"
                  alt="logo"
                  width={28}
                  height={28}
                />
                PRANA EARTH
              </div>
            </Link>
            <div className="absolute bottom-55 left-10 text-white max-w-[620px]">
              <h1 className="text-7xl font-extrabold leading-tight mb-4 text-black">
                Turning Risk
                <br />
                <span>into</span>{" "}
                <span className="text-[#216932]">Resilience</span>
              </h1>
              <p className="text-sm text-black/85 max-w-[420px] font-semibold">
                The intelligent platform for climate risk analysis, impact
                assessment, and sustainable actions across the globe.
              </p>
            </div>
            <div className="absolute bottom-20 left-10 flex items-center gap-2 text-white text-md">
              <Leaf size={28} className="text-green-800" />
              <span className="text-black font-semibold">
                Small actions today,
                <br />
                <span className="text-blue-900">lasting impact</span> tomorrow.
              </span>
            </div>
          </div>

          {/* Right form panel */}
          <div className="w-full md:w-1/2 flex items-center justify-center p-8 h-full overflow-y-auto">
            <div className="w-full max-w-[400px]">
              <div className="flex border-b mb-6">
                <button
                  onClick={() => setTab("login")}
                  className={`flex-1 pb-3 text-sm font-semibold ${tab === "login" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"}`}
                >
                  Login
                </button>
                <button
                  onClick={() => setTab("create")}
                  className={`flex-1 pb-3 text-sm font-semibold ${tab === "create" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"}`}
                >
                  Create Account
                </button>
              </div>

              {/* --- CHANGED: Added Global Error Banner Display --- */}
              {globalError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
                  {globalError}
                </div>
              )}
              {/* -------------------------------------------------- */}

              {tab === "login" ? (
                <>
                  <p className="text-sm text-gray-500 mb-6">
                    Access your account using email/password or continue with
                    Google.
                  </p>

                  <div className="flex justify-center mb-5 w-full">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() =>
                        setGlobalError(
                          "Google popup closed or authentication failed.",
                        )
                      }
                      width="100%"
                      theme="outline"
                      size="large"
                      text="continue_with"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <label className="text-sm font-medium block mb-1.5">
                    Email Address
                  </label>
                  {/* --- CHANGED: Bound state to login email input --- */}
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    placeholder="Enter your email address"
                    className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1 mb-3">
                      {errors.email}
                    </p>
                  )}
                  {!errors.email && <div className="mb-4"></div>}
                  {/* -------------------------------------------------- */}

                  <label className="text-sm font-medium block mb-1.5">
                    Password
                  </label>
                  {/* --- CHANGED: Bound state to login password input --- */}
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    placeholder="Enter your password"
                    className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1 mb-2">
                      {errors.password}
                    </p>
                  )}
                  {!errors.password && <div className="mb-3"></div>}
                  {/* ---------------------------------------------------- */}

                  <div className="flex items-center justify-between mb-6">
                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                      <input type="checkbox" className="cursor-pointer" />{" "}
                      Remember me
                    </label>
                    <Link
                      href="/sites/predict/forgot-password"
                      className="text-xs text-blue-600 font-medium hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  {/* --- CHANGED: Added onClick handler and disabled state based on isLoading --- */}
                  <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#1a82c4] to-[#16a34a] hover:opacity-90 text-white font-semibold py-3 rounded-lg text-sm transition-opacity disabled:opacity-50"
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </button>
                </>
              ) : (
                <div className="w-full max-w-[420px]">
                  <h2 className="text-sm font-bold">Create your account</h2>
                  <p className="text-sm text-gray-500 mb-3">
                    Fill in the details below to get started.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2">
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        placeholder="Enter your full name"
                        className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                      />
                      {errors.fullName && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.fullName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="Enter your email address"
                        className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mb-2">
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        placeholder="Enter your password"
                        className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                      />
                      {errors.password && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.password}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="Enter your phone number"
                        className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="text-sm font-medium block mb-1">
                      Company/Organization Name{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      placeholder="Enter company or organization"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                    />
                    {errors.company && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.company}
                      </p>
                    )}
                  </div>

                  <div className="mb-2">
                    <label className="text-sm font-medium block mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={formData.jobTitle}
                      onChange={(e) =>
                        setFormData({ ...formData, jobTitle: e.target.value })
                      }
                      placeholder="Enter your job title"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                    />
                    {errors.jobTitle && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.jobTitle}
                      </p>
                    )}
                  </div>

                  <div className="mb-2">
                    <label className="text-sm font-medium block mb-1">
                      Country/Region <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      placeholder="Select your country or region"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                    />
                    {errors.country && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.country}
                      </p>
                    )}
                  </div>

                  <div className="mb-0">
                    <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={formData.agreed}
                        onChange={(e) =>
                          setFormData({ ...formData, agreed: e.target.checked })
                        }
                      />
                      I agree to the{" "}
                      <Link href="#" className="text-blue-600 hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="#" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                    {errors.agreed && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.agreed}
                      </p>
                    )}
                  </div>

                  {/* --- CHANGED: Handled Register submission with API and disabled state --- */}
                  <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#1a82c4] to-[#16a34a] hover:opacity-90 text-white font-semibold py-2.5 rounded-lg text-sm mt-3 transition-opacity disabled:opacity-50"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </button>
                  {/* ------------------------------------------------------------------------ */}

                  <p className="text-center text-xs text-gray-500 mt-2">
                    Already have an account?{" "}
                    <button
                      onClick={() => setTab("login")}
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Login
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 md:gap-0 px-4 md:px-8 py-3 border-t text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Image
              src="/prana-earth-logo-optimized.webp"
              alt="logo"
              width={14}
              height={14}
            />
            © 2026 Prana Earth. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-5">
            <Link href="#" className="hover:text-gray-800">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-gray-800">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-gray-800">
              Cookie Policy
            </Link>
          </div>
        </footer>
      </div>
    </GoogleOAuthProvider>
  );
}
