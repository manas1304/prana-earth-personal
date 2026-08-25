import Link from "next/link";

export default function PartnerCTA() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 flex flex-col items-center text-center">
        
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
          Ready to scale your climate impact?
        </h2>
        
        <p className="text-gray-500 text-base mb-8">
          Join global leaders in delivering verified nature-based solutions.
        </p>
        
        <Link
          href="/contact"
          className="bg-[#064e3b] hover:bg-[#043d2e] text-white font-medium px-8 py-3 rounded-full transition-colors duration-200"
        >
          Become a Partner
        </Link>
        
      </div>
    </section>
  );
}