"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, ArrowRight, Send } from "lucide-react";
import MarketplaceNavbar from "@/components/marketplace/navbar";
import Footer from "@/components/marketplace/footer";
import { useState } from "react";
import { toast } from "sonner";
import { submitContactForm } from "@/actions/contact.actions";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    role: "",
    interest: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res: any = await submitContactForm({
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        message: formData.message,
        subject: formData.interest, // Mapping interest to subject
        metadata: { company: formData.company, role: formData.role }, // Grouping extras
      });

      if (res?.success) {
        toast.success(
          "Message sent successfully! We will get back to you soon.",
        );
        // Clear the form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          company: "",
          role: "",
          interest: "",
          message: "",
        });
      } else {
        toast.error(
          res?.message || "Failed to send message. Please try again.",
        );
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <MarketplaceNavbar />

      {/* Header Section */}
      <div className="bg-white pt-16 pb-12 text-center border-b border-gray-100">
        <div className="max-w-[700px] mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-gray-500 text-[15px] leading-relaxed">
            Ready to transform your climate strategy? Our team is here to help
            you get started with Prana Earth
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-[1100px] mx-auto w-full px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Send us a message
            </h2>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="john.doe@company.com"
                  required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Company name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Company Name"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Role
                  </label>
                  <input
                    type="text"
                    placeholder="Sustainability Director"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  I'm interested in <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                    value={formData.interest}
                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your climate goals and how we can help..."
                  required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#1a82c4] transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-3 rounded-lg text-sm transition flex items-center justify-center gap-2 mt-2"
              >
                <Send size={16} /> Send Message
              </button>

              <p className="text-center text-[11px] text-gray-400 mt-4">
                By submitting this form, you agree to our privacy policy and
                terms of service.
              </p>
            </form>
          </div>

          {/* Right Column: Info Cards */}
          <div className="space-y-4">
            {/* Contact Methods */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-[#1a82c4]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Email Us</h4>
                <p className="text-xs text-gray-500">hello@pranaearth.com</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Phone size={18} className="text-[#1a82c4]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Call Us</h4>
                <p className="text-xs text-gray-500">+1 (555) 123-4567</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-[#1a82c4]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Visit Us</h4>
                <p className="text-xs text-gray-500">San Francisco, CA</p>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-[#eef5fa] rounded-xl p-6 border border-blue-100/50 mt-6">
              <h4 className="text-sm font-bold text-gray-900 mb-4">
                Office Hours
              </h4>
              <div className="flex justify-between items-center text-xs mb-3">
                <span className="text-gray-500">Monday - Friday</span>
                <span className="font-bold text-gray-900">9AM - 6PM PST</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Saturday - Sunday</span>
                <span className="font-bold text-gray-900">Closed</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-4">
              <h4 className="text-sm font-bold text-gray-900 mb-4">
                Quick Links
              </h4>
              <div className="space-y-3">
                <Link
                  href="#"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#1a82c4] hover:text-[#156a9c] transition-colors"
                >
                  FAQ & Support <ArrowRight size={14} />
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#1a82c4] hover:text-[#156a9c] transition-colors"
                >
                  Documentation <ArrowRight size={14} />
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#1a82c4] hover:text-[#156a9c] transition-colors"
                >
                  Case Studies <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
