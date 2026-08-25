import { Target, Eye, BarChart, Zap, Globe, Users, Hourglass } from "lucide-react";

export default function MissionVisionValues() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Mission & Vision */}
        <div className="flex flex-col gap-8">
          {/* Mission Card */}
          <div className="bg-[#fafbfc] border border-gray-100 rounded-[2rem] p-8 md:p-10 shadow-sm">
            <div className="w-12 h-12 bg-blue-100/50 rounded-xl flex items-center justify-center mb-6">
              <Target className="text-blue-500" size={24} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-500 leading-relaxed">
              Prana Earth exists to bridge the gap between corporate climate commitments and real environmental action. We use AI-powered risk intelligence to help organizations identify their specific vulnerabilities, then connect them with verified projects that deliver measurable impact.
            </p>
          </div>

          {/* Vision Card */}
          <div className="bg-[#fafbfc] border border-gray-100 rounded-[2rem] p-8 md:p-10 shadow-sm">
            <div className="w-12 h-12 bg-blue-100/50 rounded-xl flex items-center justify-center mb-6">
              <Eye className="text-blue-500" size={24} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
            <p className="text-gray-500 leading-relaxed">
              We envision a future where every corporate decision reinforces environmental resilience and every project creates measurable, lasting impact for the planet. In this world, the global economy operates in harmony with Earth’s natural systems.
            </p>
          </div>
        </div>

        {/* Right Column: Values */}
        <div className="bg-[#fafbfc] border border-gray-100 rounded-[2rem] p-8 md:p-10 shadow-sm h-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Values</h2>
          
          <div className="flex flex-col gap-8">
            {/* Value 1 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-blue-100/50 rounded-lg flex items-center justify-center shrink-0 mt-1">
                <BarChart className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-gray-800 mb-1">Evidence-Based</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Every project is verified through rigorous third-party audits and real-time monitoring
                </p>
              </div>
            </div>

            {/* Value 2 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-blue-100/50 rounded-lg flex items-center justify-center shrink-0 mt-1">
                <Zap className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-gray-800 mb-1">Action-Oriented</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  We prioritize measurable impact over marketing claims and empty promises
                </p>
              </div>
            </div>

            {/* Value 3 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-blue-100/50 rounded-lg flex items-center justify-center shrink-0 mt-1">
                <Globe className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-gray-800 mb-1">Globally Connected</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Access to verified projects across 47 countries and all major ecosystems
                </p>
              </div>
            </div>

            {/* Value 4 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-blue-100/50 rounded-lg flex items-center justify-center shrink-0 mt-1">
                <Users className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-gray-800 mb-1">Community-Driven</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Local communities are partners, not beneficiaries, ensuring long-term success
                </p>
              </div>
            </div>

            {/* Value 5 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-blue-100/50 rounded-lg flex items-center justify-center shrink-0 mt-1">
                <Hourglass className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-gray-800 mb-1">Integrity-First</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  We maintain the highest standards of data governance and verified transparency in every project.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}