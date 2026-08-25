"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import MarketplaceNavbar from "@/components/predict/navbar";
import MarketplaceFooter from "@/components/marketplace/footer";
import { useState, useEffect } from "react";
import { getCurrentUser, updateProfile } from "@/actions/auth.actions";
import { toast } from "sonner";

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    jobTitle: "",
    phone: "",
    countryRegion: "India",
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const response: any = await getCurrentUser();
        if (response?.success && response?.data?.user) {
          const u = response.data.user;
          setFormData({
            fullName: u.fullName || "",
            email: u.email || "",
            jobTitle: u.jobTitle || "",
            phone: u.phone || "",
            countryRegion: u.countryRegion || "India",
          });
        }
      } catch (error) {
        toast.error("Failed to load user data.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // The backend uses cookies, so we just pass the updated fields
      const result: any = await updateProfile({
        fullName: formData.fullName,
        jobTitle: formData.jobTitle,
        phone: formData.phone,
        countryRegion: formData.countryRegion,
      });

      if (result?.success) {
        toast.success("Profile updated successfully!");
      } else {
        toast.error(result?.message || "Failed to update profile.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketplaceNavbar />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-900 hover:text-blue-600 mb-6 transition-colors"
        >
          <ChevronLeft size={24} />
        </Link>

        {/* Top Section: My Profile */}
        <div className="bg-[#f4f5f7] rounded-3xl p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-8">My Profile</h2>

          <div className="flex flex-col md:flex-row gap-10">
            {/* Avatar Column */}
            <div className="flex flex-col items-center gap-4 shrink-0 md:ml-4">
              <div className="w-32 h-32 bg-[#1a82c4] rounded-full flex items-center justify-center text-white text-5xl font-medium tracking-wide">
                JD
              </div>
              <button className="bg-transparent border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Change Photo
              </button>
            </div>

            {/* Form Column */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-900">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="w-full bg-transparent border border-gray-300 rounded text-sm px-3 py-2.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-900">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-transparent border border-gray-300 rounded text-sm px-3 py-2.5 focus:outline-none focus:border-blue-500 text-gray-500"
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-900">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, jobTitle: e.target.value })
                    }
                    className="w-full bg-transparent border border-gray-300 rounded text-sm px-3 py-2.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-900">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full bg-transparent border border-gray-300 rounded text-sm px-3 py-2.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-900">
                    Country/Region
                  </label>
                  <select
                    value={formData.countryRegion}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        countryRegion: e.target.value,
                      })
                    }
                    className="w-full bg-transparent border border-gray-300 rounded text-sm px-3 py-2.5 focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#1a82c4] hover:bg-[#156a9c] text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[4fr_6fr] gap-6">
          {/* Account Summary */}
          <div className="bg-[#f4f5f7] rounded-3xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Account Summary
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Account Type</span>
                <span className="text-gray-600">Bundle Plan</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Member Since</span>
                <span className="text-gray-600">15 Jan 2026</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Status</span>
                <span className="text-gray-600">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Plan Valid Till</span>
                <span className="text-gray-600">20 Dec 2026</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">
                  Assessments Used
                </span>
                <span className="text-gray-600">9 of 20</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">
                  Users in Organization
                </span>
                <span className="text-gray-600">6</span>
              </div>
            </div>
            <div className="mt-8 flex justify-center lg:justify-start">
              <button className="bg-transparent border border-gray-300 text-gray-700 text-sm font-semibold px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Manage Subscription
              </button>
            </div>
          </div>

          {/* Company Affirmation */}
          <div className="bg-[#f4f5f7] rounded-3xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Company Affirmation
            </h2>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <p className="text-sm text-gray-800 font-medium leading-relaxed max-w-sm">
                You are associated with the organization below. You can manage
                organization details in the Organization tab.
              </p>
              <div className="text-sm text-right shrink-0">
                <p className="text-gray-600 mb-1">
                  Member since{" "}
                  <span className="text-gray-900">12 Jan 2026</span>
                </p>
                <p className="text-gray-600 mb-4">
                  Role:{" "}
                  <span className="text-gray-900">Sustainability Manager</span>
                </p>
                <button className="bg-transparent border border-gray-300 text-gray-700 text-sm font-semibold px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors w-full md:w-auto">
                  View Organization
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
