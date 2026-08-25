"use client";

import { useState } from "react";
import { Mail, Lock, EyeOff, Eye, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/actions/auth.actions"; // Adjust path if needed
import { toast } from "sonner"; // Assuming you use Sonner based on previous files

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res: any = await login({ email, password });
      
      if (res?.success) {
        toast.success("Login successful");
        router.push("/dashboard"); // Redirects to admin.localhost:3000/dashboard
      } else {
        toast.error(res?.message || "Invalid credentials.");
      }
    } catch (error) {
      toast.error("An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eef7f1] via-[#f4f9f6] to-[#f8faf9] px-4">
      <div className="bg-white p-8 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[400px] border border-gray-100">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          {/* Replace src with your actual Prana Earth logo path */}
          <div className="mb-3">
            <Image 
              src="/prana-earth-logo-optimized.webp" 
              alt="Prana Earth" 
              width={48} 
              height={48} 
              className="object-contain"
            />
          </div>
          <h1 className="text-[22px] font-bold text-[#1a82c4] mb-1">Prana Earth</h1>
          <p className="text-xs text-gray-500 font-medium">Admin Panel Login</p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleLogin}>
          
          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={15} className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pranaearth.com"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#1a82c4] focus:ring-1 focus:ring-[#1a82c4] transition-colors placeholder:text-gray-300 text-gray-900"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                Password
              </label>
              <Link href="#" className="text-[11px] font-medium text-[#1a82c4] hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={15} className="text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#1a82c4] focus:ring-1 focus:ring-[#1a82c4] transition-colors placeholder:text-gray-300 text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>

          {/* Remember Device */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember"
              className="w-3.5 h-3.5 rounded border-gray-300 text-[#1a82c4] focus:ring-[#1a82c4] cursor-pointer"
            />
            <label htmlFor="remember" className="text-xs text-gray-500 cursor-pointer select-none">
              Remember this device
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1272af] hover:bg-[#0f6096] text-white font-semibold py-2.5 rounded-md text-sm transition-colors flex items-center justify-center gap-1.5 mt-2"
          >
            {isLoading ? "Signing in..." : <>Sign In <ArrowRight size={15} strokeWidth={2.5} /></>}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 text-center text-[11px] text-gray-500 leading-relaxed border-t border-gray-50">
          <p>Secure access for authorized personnel only.</p>
          <p>
            Need help? <Link href="#" className="text-[#1a82c4] hover:underline font-medium">Contact IT Support</Link>
          </p>
        </div>

      </div>
    </div>
  );
}