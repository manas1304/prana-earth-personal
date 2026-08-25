import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const socialLinks = [
  { icon: <XIcon />, href: "https://x.com/prana_earth", label: "X" },
  { icon: <LinkedInIcon />, href: "https://www.linkedin.com/company/pranaearth/", label: "LinkedIn" },
  { icon: <InstagramIcon />, href: "https://www.instagram.com/pranaearthdotcom/", label: "Instagram" },
  { icon: <Mail size={16} />, href: "mailto:contact@pranaearth.com", label: "Email" },
];

export default function MarketplaceFooter() {


  return (
    <footer className="bg-[#111] text-[#ccc] pt-15 px-6 pb-0">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 pb-12">
        {/* Brand Column */}
        <div className="col-span-1 sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5 mb-4">
            <Image
              src="/prana-earth-logo-with-bg.webp"
              alt="Prana Earth"
              width={36}
              height={36}
            />
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">Prana Earth</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-70">
            Transform climate risk into measurable environmental impact. Join
            corporate teams worldwide using data-driven insights for
            sustainability.
          </p>
          <div className="flex gap-2.5">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 border border-[#333] rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Product Column */}
        <div>
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-[0.5px]">
            Product
          </h4>
          <Link
            href={process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://marketplace.localhost:3000"}
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            Marketplace
          </Link>
          <Link
            href={process.env.NEXT_PUBLIC_PREDICT_URL || "http://localhost:3000"}
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            Predict
          </Link>
          <Link
            href="#"
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            Analytics
          </Link>
        </div>

        {/* Resources Column */}
        <div>
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-[0.5px]">
            Resources
          </h4>
          <Link
            href="#"
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            Documentation
          </Link>
          {/* <Link
            href="#"
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            Case Studies
          </Link> */}
          <Link
            href="#"
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            Blog
          </Link>
          <Link
            href="/contact"
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            Support
          </Link>
        </div>

        {/* Company Column */}
        <div>
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-[0.5px]">
            Company
          </h4>
          <Link
            href="/about"
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            Contact
          </Link>
          <Link
            href="#"
            className="block text-sm text-gray-400 mb-2.5 hover:text-white transition-colors duration-200"
          >
            Privacy
          </Link>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="max-w-[1200px] mx-auto border-t border-[#222] py-5 flex flex-wrap justify-between items-center text-xs text-gray-600 gap-2">
        <span>© 2026 Prana Earth. All rights reserved.</span>
        <div className="flex gap-5">
          <Link
            href="#"
            className="text-gray-600 hover:text-white transition-colors duration-200"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="text-gray-600 hover:text-white transition-colors duration-200"
          >
            Privacy
          </Link>
          <Link
            href="#"
            className="text-gray-600 hover:text-white transition-colors duration-200"
          >
            Cookies
          </Link>
        </div>
      </div>
    </footer>
  );
}
