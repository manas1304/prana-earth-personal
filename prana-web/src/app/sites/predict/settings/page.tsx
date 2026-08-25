"use client";

import { useEffect, useState, useRef } from "react";
import PredictNavbar from "@/components/predict/navbar";
import SettingsSidebar from "@/components/predict/settings-sidebar";
import MarketplaceFooter from "@/components/marketplace/footer";
import Image from "next/image";
import { Pencil, UploadCloud, Eye, EyeOff, Download, Mail, Building2, Bell, FileText } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("organization");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PredictNavbar />
      
      {/* Background Wrapper */}
      <div className="flex-1 bg-[#F8F9FC] py-10 flex justify-center">
        <div className="w-full max-w-[1150px] px-6">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your account, organization, preferences and integrations.</p>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Component */}
            <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Middle Section (Content) */}
            <main 
              className="bg-white rounded-xl shadow-sm border border-gray-100"
              style={{ width: "100%", maxWidth: "904px", minHeight: "736px" }}
            >
              {activeTab === "organization" && <OrganizationTab />}
              {activeTab === "notifications" && <NotificationsTab />}
              {activeTab === "security" && <SecurityTab />}
              {activeTab === "billing" && <BillingTab />}
            </main>
          </div>
        </div>
      </div>

      <MarketplaceFooter />
    </div>
  );
}

// --- Tab Components ---

function OrganizationTab() {
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  
  const [orgData, setOrgData] = useState({
    name: "Greentech Solutions",
    industry: "Renewable Energy",
    about: "Greentech Solutions is a leading provider of renewable energy and sustainable infrastructure solutions. Our mission is to drive positive environmental impact through innovation and responsible business practices."
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-8">
      {/* Organization Information */}
      <div className="mb-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">Organization Information</h2>
            <p className="text-xs text-gray-500 mt-1">Update your organization details.</p>
          </div>
          <button 
            onClick={() => setIsEditingOrg(!isEditingOrg)}
            className="flex items-center gap-2 border border-green-500 text-green-600 hover:bg-green-50 text-xs font-semibold py-1.5 px-4 rounded-md transition-colors"
          >
            <Pencil size={14} /> {isEditingOrg ? "Save Details" : "Edit Profile"}
          </button>
        </div>

        <div className="border border-gray-100 rounded-lg p-6 flex flex-col gap-6">
          <div className="grid grid-cols-3 items-center border-b border-gray-50 pb-6">
            <div className="flex items-center gap-3 col-span-1 text-sm font-semibold text-gray-700">
              <div className="bg-green-50 p-2 rounded-md"><Building2 size={16} className="text-green-600" /></div>
              Organization Name
            </div>
            <div className="col-span-2 text-sm text-gray-500">
              {isEditingOrg ? (
                <input type="text" value={orgData.name} onChange={(e) => setOrgData({...orgData, name: e.target.value})} className="border rounded p-2 w-full outline-none focus:border-blue-500" />
              ) : orgData.name}
            </div>
          </div>

          <div className="grid grid-cols-3 items-center border-b border-gray-50 pb-6">
            <div className="flex items-center gap-3 col-span-1 text-sm font-semibold text-gray-700">
              <div className="bg-green-50 p-2 rounded-md"><Building2 size={16} className="text-green-600" /></div>
              Organization Logo
            </div>
            <div className="col-span-2 flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 relative group">
                <Image src="/prana-earth-logo-optimized.webp" alt="Logo" width={40} height={40} className="object-cover" />
                {isEditingOrg && (
                  <div 
                    className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud size={16} className="text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{orgData.name}</p>
                <p className="text-[10px] text-gray-400">Sustainable Technology, Greener Tomorrow</p>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
            </div>
          </div>

          <div className="grid grid-cols-3 items-center">
            <div className="flex items-center gap-3 col-span-1 text-sm font-semibold text-gray-700">
              <div className="bg-green-50 p-2 rounded-md"><Building2 size={16} className="text-green-600" /></div>
              Industry Type
            </div>
            <div className="col-span-2 text-sm text-gray-500">
              {isEditingOrg ? (
                <input type="text" value={orgData.industry} onChange={(e) => setOrgData({...orgData, industry: e.target.value})} className="border rounded p-2 w-full outline-none focus:border-blue-500" />
              ) : orgData.industry}
            </div>
          </div>
        </div>
      </div>

      {/* About Organization */}
      <div>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-base font-bold text-gray-900">About Organization</h2>
          <button 
            onClick={() => setIsEditingAbout(!isEditingAbout)}
            className="flex items-center gap-2 border border-green-500 text-green-600 hover:bg-green-50 text-xs font-semibold py-1.5 px-4 rounded-md transition-colors"
          >
            <Pencil size={14} /> {isEditingAbout ? "Save About" : "Edit Profile"}
          </button>
        </div>
        <div className="border border-gray-100 rounded-lg p-6">
          {isEditingAbout ? (
            <textarea 
              value={orgData.about} 
              onChange={(e) => setOrgData({...orgData, about: e.target.value})}
              className="w-full h-32 border rounded-md p-3 text-sm outline-none focus:border-blue-500 resize-none"
            />
          ) : (
            <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">{orgData.about}</p>
          )}
        </div>
      </div>

      {/* <div className="mt-8 flex justify-end gap-4 border-t border-gray-100 pt-6">
        <button className="text-sm font-semibold text-gray-400 hover:text-gray-700">Reset to Defaults</button>
        <button className="bg-[#16a34a] hover:bg-green-700 text-white text-sm font-semibold py-2 px-6 rounded-md transition-colors">Save Changes</button>
      </div> */}
    </div>
  );
}

function NotificationsTab() {
  const [emailToggle, setEmailToggle] = useState(true);

  const prefs = [
    { title: "Assessment Failed", desc: "Shows all the Assessment that are failed", active: true },
    { title: "Report Notifications", desc: "Receive alerts when reports are generated or ready to download.", active: true },
    { title: "Action Plan Reminders", desc: "Reminders for upcoming or overdue action plans.", active: true },
    { title: "Billing & Payments", desc: "Updates on billing, payments, invoices and plan changes.", active: true },
    { title: "Product Announcements", desc: "News about new features, updates and product announcements.", active: true },
  ];

  return (
    <div className="p-8">
      <h2 className="text-base font-bold text-gray-900 mb-1">Notifications</h2>
      <p className="text-xs text-gray-500 mb-8">Manage how and when you want to receive notifications.</p>

      <div className="flex justify-between items-center border-b border-gray-100 pb-6 mb-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Email Notifications</h3>
          <p className="text-xs text-gray-500">Receive notifications via email.</p>
        </div>
        {/* Simple Toggle Switch */}
        <div 
          onClick={() => setEmailToggle(!emailToggle)}
          className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${emailToggle ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${emailToggle ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-10">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Email Address</h3>
          <p className="text-xs text-gray-500">arjun.reddy@greentech.com</p>
        </div>
        <button className="border border-red-500 text-red-500 hover:bg-red-50 text-xs font-semibold py-1.5 px-4 rounded-md flex items-center gap-2">
          <Mail size={14} /> Change Email
        </button>
      </div>

      <h3 className="text-sm font-bold text-gray-900 mb-1">Notification Preferences</h3>
      <p className="text-xs text-gray-500 mb-6">You will receive the following notifications at the email address above.</p>

      <table className="w-full text-left">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="pb-3 font-medium">Notification</th>
            <th className="pb-3 font-medium text-right pr-6">Email</th>
          </tr>
        </thead>
        <tbody>
          {prefs.map((pref, idx) => (
            <tr key={idx} className="border-b border-gray-50 last:border-0">
              <td className="py-4">
                <div className="flex items-start gap-4">
                  <div className="bg-gray-50 p-2 rounded text-gray-400 mt-1"><Bell size={16} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-700">{pref.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{pref.desc}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 text-right pr-6">
                <input type="checkbox" defaultChecked={pref.active} className="w-4 h-4 accent-red-500" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SecurityTab() {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="p-8">
      <h2 className="text-base font-bold text-gray-900 mb-8">Security</h2>

      <div className="max-w-md">
        <div className="mb-6 relative">
          <label className="block text-xs font-bold text-gray-700 mb-2">Old Password</label>
          <input 
            type={showOld ? "text" : "password"} 
            className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:border-blue-500 pr-10" 
          />
          <button onClick={() => setShowOld(!showOld)} className="absolute right-3 top-8 text-gray-400">
            {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="mb-2 relative">
          <label className="block text-xs font-bold text-gray-700 mb-2">New Password</label>
          <input 
            type={showNew ? "text" : "password"} 
            className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:border-blue-500 pr-10" 
          />
          <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-8 text-gray-400">
            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="text-[10px] leading-tight mb-6">
          <p className="text-green-600 font-semibold">Minimum 8 characters</p>
          <p className="text-gray-500">At least 1 uppercase letter (A-Z)</p>
          <p className="text-gray-500">At least 1 lowercase letter (a-z)</p>
          <p className="text-gray-500">At least 1 number (0-9)</p>
          <p className="text-gray-500">At least 1 special character (e.g., @, #, $, %, &, !)</p>
          <p className="text-red-500 font-semibold">Must not contain spaces</p>
          <p className="text-gray-500">Must not be the same as your previous password (if applicable)</p>
          <p className="text-gray-500">Password and Confirm Password must match</p>
        </div>

        <div className="mb-8 relative">
          <label className="block text-xs font-bold text-gray-700 mb-2">Confirm New Password</label>
          <input 
            type={showConfirm ? "text" : "password"} 
            className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:border-blue-500 pr-10" 
          />
          <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-8 text-gray-400">
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex gap-4">
          <button className="bg-[#0b5cff] hover:bg-blue-700 text-white text-xs font-semibold py-2 px-6 rounded-md transition-colors">
            Change Password
          </button>
          <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold py-2 px-6 rounded-md transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface Invoice {
  id: string;
  date: string;                  // ISO
  description: string;           // plan name
  plan: string | null;            // "PREDICT" | "MARKETPLACE" | "BUNDLE"
  amount: number;
  currency: string;
  status: string;                // SUCCESS / PENDING / etc.
  invoiceUrl: string | null;     // /api/billing/invoices/{id}/download
}

function BillingTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/billing/invoices", {
          credentials: "include",
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message ?? "Failed to fetch invoices");
        }
        setInvoices(json.data.invoices ?? []);
        setError(null);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to fetch invoices");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="p-8">
      {loading && (
        <p className="text-xs text-gray-400 mb-4">Loading invoices…</p>
      )}
      {error && (
        <p className="text-xs text-red-600 mb-4">{error}</p>
      )}
      {!loading && !error && invoices.length === 0 && (
        <p className="text-xs text-gray-400 mb-4">No invoices yet.</p>
      )}

      <table className="w-full text-left">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Description</th>
            <th className="pb-3 font-medium">Plan</th>
            <th className="pb-3 font-medium">Amount</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium text-right pr-4">Invoice</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const paid = inv.status === "SUCCESS";
            return (
              <tr
                key={inv.id}
                className="border-b border-gray-50 last:border-0 text-sm"
              >
                <td className="py-4 font-semibold text-gray-700 text-xs">
                  {formatDate(inv.date)}
                </td>
                <td className="py-4">
                  <div className={paid ? "text-green-600" : "text-gray-400"}>
                    <FileText size={16} />
                  </div>
                </td>
                <td className="py-4">
                  <p className="font-bold text-gray-900 text-xs">
                    {inv.description}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {paid ? "Paid" : inv.status}
                  </p>
                </td>
                <td className="py-4 text-xs text-gray-700">
                  {inv.plan ?? "—"}
                </td>
                <td className="py-4 font-bold text-gray-900 text-xs">
                  {inv.currency} {inv.amount.toFixed(2)}
                </td>
                <td className="py-4">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      paid
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {paid ? "Paid" : inv.status}
                  </span>
                </td>
                <td className="py-4 text-right pr-4">
                  {inv.invoiceUrl ? (
                    <a
                      href={inv.invoiceUrl}
                      // The endpoint sets Content-Disposition: attachment,
                      // so the browser downloads the file as
                      // `INV-XXXXXXXX.txt` without any client-side Blob
                      // wrapping.
                      download
                      className="text-green-600 flex items-center gap-1 ml-auto text-xs font-semibold hover:underline cursor-pointer"
                    >
                      Download
                      <Download
                        size={14}
                        className="text-gray-400 ml-2"
                      />
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">
                      Unavailable
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}