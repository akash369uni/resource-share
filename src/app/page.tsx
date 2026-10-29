'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/20">
              🤝
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">ResourceShare</h1>
          </div>
          <div className="flex gap-2.5 items-center">
            <Link 
              href="/login" 
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition border border-slate-200"
            >
              Log In
            </Link>
            <Link 
              href="/login" 
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="px-6 py-16 md:py-24 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3.5 py-1.5 rounded-full text-xs font-semibold">
          <span>🚀</span>
          <span>Bridging the Educational Resource Gap</span>
        </div>
        
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
          Unlock Underused Equipment & Spaces for Every School.
        </h1>
        
        <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          A trusted, automated platform where institutions safely share laboratories, smart classrooms, buses, and science parks with verified educators across the city.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link 
            href="/login" 
            className="px-6 py-3.5 text-white bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition"
          >
            Get Started Now
          </Link>
          <a 
            href="#how-it-works" 
            className="px-6 py-3.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 font-semibold rounded-xl text-xs transition shadow-xs"
          >
            See How It Works
          </a>
        </div>
      </header>

      {/* CORE HIGHLIGHTS */}
      <section className="px-6 py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Why ResourceShare is Different</h2>
            <p className="text-xs text-slate-500">Built to ensure fairness, security, and accountability across institutions.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center text-xl font-bold">
                🧠
              </div>
              <h3 className="text-base font-bold text-slate-900">Smart Fair Allocation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                No more First-Come-First-Serve. Our priority engine evaluates group size, lead time, and usage history to ensure equitable access.
              </p>
            </div>

            <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center text-xl font-bold">
                🛡️
              </div>
              <h3 className="text-base font-bold text-slate-900">Verified Trust Network</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every teacher and institution must upload official ID documents. A central Admin verifies every account before they can request.
              </p>
            </div>

            <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center text-xl font-bold">
                📸
              </div>
              <h3 className="text-base font-bold text-slate-900">Condition Accountability</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Built-in Check-In and Check-Out flows with mandatory photo documentation protect owners' property and hold users accountable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* THE END-TO-END FLOW */}
      <section id="how-it-works" className="px-6 py-16 md:py-24 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">The End-to-End Workflow</h2>
            <p className="text-xs text-slate-400">Streamlined interaction for owners, teachers, and administrators.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                01
              </div>
              <h3 className="text-base font-bold text-white">List & Discover</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Institutions (Owners) list idle labs or buses. Verified teachers search and discover these resources city-wide.
              </p>
            </div>

            <div className="p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                02
              </div>
              <h3 className="text-base font-bold text-white">Automated Priority Check</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Teachers submit a request. The system instantly checks for scheduling conflicts, calculates a Priority Score, and forwards for review.
              </p>
            </div>

            <div className="p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                03
              </div>
              <h3 className="text-base font-bold text-white">Secure Check-In / Return</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The teacher uploads a photo of condition upon pickup and return. Late returns trigger overdue warnings.
              </p>
            </div>

            <div className="p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                04
              </div>
              <h3 className="text-base font-bold text-white">Admin Governance</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                If damage occurs, admins review reported incidents. All system activities are logged into an audit trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-8 bg-white border-t border-slate-200/80 text-slate-500 text-xs">
        <p>© 2026 ResourceShare. Built for Educational Equity.</p>
      </footer>
    </div>
  )
}