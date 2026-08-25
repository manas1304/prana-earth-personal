"use client";

import { useState } from "react";
import Link from "next/link";
import PredictNavbar from "@/components/predict/navbar"; // Adjust path
import Sidebar from "@/components/predict/sidebar"; // Adjust path
import MarketplaceFooter from "@/components/marketplace/footer";
import {
  BookOpen,
  MessageSquare,
  HelpCircle,
  FileText,
  ChevronRight,
  Headphones,
  Phone,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from "lucide-react";

export default function HelpAndSupportPage() {
  const [isBugOpen, setIsBugOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PredictNavbar />

      <div className="flex flex-1 max-w-full">
        <div className="hidden lg:block"><Sidebar/></div>

        {/* Middle Section */}
        <main
          className="flex-1 p-8 overflow-y-auto bg-[#F9FBFC]"
          style={{ maxWidth: "1127px" }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-6">
            <span className="cursor-pointer hover:text-gray-900">Help & Support</span>
            <ChevronRight size={14} />
            <span className="text-gray-900">Overview</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-sm text-gray-500 mt-1">
              Find answers, get help, and contact our support team.
            </p>
          </div>

          {/* Top Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Knowledge Base */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-start cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">Knowledge Base</h3>
              <p className="text-xs text-gray-500 mb-4 flex-1">
                Browse articles and guides to find answers to common questions.
              </p>
              <div className="w-full flex justify-end">
                <ChevronRight size={18} className="text-gray-900" />
              </div>
            </div>

            {/* Contact Support */}
            <Link href="/contact" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-start cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">Contact Support</h3>
              <p className="text-xs text-gray-500 mb-4 flex-1">
                Get in touch with our team for personalized assistance.
              </p>
              <div className="w-full flex justify-end">
                <ChevronRight size={18} className="text-gray-900" />
              </div>
            </Link>

            {/* FAQs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-start cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
                <HelpCircle size={24} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">FAQs</h3>
              <p className="text-xs text-gray-500 mb-4 flex-1">
                Find quick answers to frequently asked questions.
              </p>
              <div className="w-full flex justify-end">
                <ChevronRight size={18} className="text-gray-900" />
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-10">
            
            {/* Left Column: Popular Articles */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-gray-900">Popular Articles</h2>
                <span className="text-xs font-bold text-blue-600 cursor-pointer hover:underline">View all articles</span>
              </div>
              
              <div className="flex flex-col">
                <ArticleRow title="Getting Started with Prana Earth" category="General" readTime="5 min read" />
                <ArticleRow title="How to Create an Assessment" category="Assessments" readTime="4 min read" />
                <ArticleRow title="Understanding Your Risk Score" category="Risk Analytics" readTime="6 min read" />
                <ArticleRow title="Managing Users and Roles" category="Settings" readTime="3 min read" />
                <ArticleRow title="Exporting Reports and Data" category="Reports" readTime="4 min read" />
              </div>
            </div>

            {/* Right Column: Need more help? */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-1">Need more help?</h2>
              <p className="text-xs text-gray-500 mb-6">Our support team is here for you.</p>

              <div className="flex flex-col gap-4">
                {/* Email Support */}
                <div className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-gray-400 transition-colors">
                  <div className="flex items-center gap-4">
                    <Headphones size={20} className="text-green-600" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Email Support</h4>
                      <p className="text-xs text-gray-500 mt-0.5">support@pranaearth.com</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </div>

                {/* Call Us */}
                <div className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-gray-400 transition-colors">
                  <div className="flex items-center gap-4">
                    <Phone size={20} className="text-indigo-600" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Call Us</h4>
                      <p className="text-xs text-gray-500 mt-0.5">+91 1800 123 4567</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </div>

                {/* Report a Bug (Expandable) */}
                <div className={`bg-white border transition-colors rounded-lg overflow-hidden ${isBugOpen ? 'border-blue-500' : 'border-gray-300 hover:border-gray-400'}`}>
                  <div 
                    onClick={() => setIsBugOpen(!isBugOpen)}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <AlertCircle size={20} className="text-gray-900" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Report a Bug</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Enter the error or the bug you are facing</p>
                      </div>
                    </div>
                    {isBugOpen ? (
                      <ChevronUp size={18} className="text-gray-900" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400" />
                    )}
                  </div>
                  
                  {/* Expanded Bug Form matching Image 2 */}
                  {isBugOpen && (
                    <div className="p-4 pt-0 border-t border-gray-100 bg-white">
                      <textarea 
                        className="w-full h-32 mt-4 p-3 border border-blue-400 rounded-md text-sm text-gray-700 outline-none resize-none placeholder-gray-400"
                        placeholder="Add information that we can use to help you"
                      ></textarea>
                      <div className="flex items-center justify-between bg-gray-50 -mx-4 -mb-4 px-4 py-3 border-t border-gray-100 mt-0 rounded-b-lg">
                        <button className="flex items-center gap-2 text-xs text-gray-500 font-semibold hover:text-gray-700 transition-colors">
                          <Paperclip size={14} /> Attach File
                        </button>
                        <button className="bg-[#0b5cff] hover:bg-blue-700 text-white text-xs font-semibold py-2 px-6 rounded-md transition-colors">
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
          
          <div className="mt-8">
            <Link href="/marketplace" className="text-xs font-bold text-[#1a82c4] hover:underline">
              Explore Marketplace for more &gt;
            </Link>
          </div>

        </main>
      </div>

      <MarketplaceFooter />
    </div>
  );
}

// Reusable Article Component
function ArticleRow({ title, category, readTime }: { title: string, category: string, readTime: string }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0 cursor-pointer group">
      <div className="flex items-start gap-4">
        <FileText size={18} className="text-[#1a82c4] mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-gray-700 group-hover:text-[#1a82c4] transition-colors">{title}</h4>
          <p className="text-[10px] text-gray-400 mt-1">{category} • {readTime}</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-400 group-hover:text-[#1a82c4] transition-colors" />
    </div>
  );
}