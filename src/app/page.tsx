import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      
      {/* NAVBAR */}
      <nav style={{ backgroundColor: 'white', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>🤝 ResourceShare</h1>
        <div style={{ display: 'flex', gap: '15px' }}>
          <Link href="/login" style={{ padding: '10px 20px', textDecoration: 'none', color: '#0f172a', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            Log In
          </Link>
          <Link href="/login" style={{ padding: '10px 20px', textDecoration: 'none', color: 'white', backgroundColor: '#0f172a', fontWeight: 'bold', borderRadius: '8px' }}>
            Register Institution
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>
          🚀 Bridging the Educational Resource Gap
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 20px 0', lineHeight: '1.2' }}>
          Unlock Underused Equipment & Spaces for Every School.
        </h1>
        <p style={{ fontSize: '20px', color: '#475569', marginBottom: '40px', lineHeight: '1.5' }}>
          A trusted, automated platform where institutions safely share laboratories, smart classrooms, buses, and science parks with verified educators across the city.
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <Link href="/login" style={{ padding: '15px 30px', textDecoration: 'none', color: 'white', backgroundColor: '#2563eb', fontWeight: 'bold', borderRadius: '8px', fontSize: '18px', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' }}>
            Get Started
          </Link>
          <a href="#how-it-works" style={{ padding: '15px 30px', textDecoration: 'none', color: '#0f172a', backgroundColor: 'white', fontWeight: 'bold', borderRadius: '8px', fontSize: '18px', border: '1px solid #cbd5e1' }}>
            See How It Works
          </a>
        </div>
      </header>

      {/* CORE HIGHLIGHTS */}
      <section style={{ padding: '60px 20px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '50px' }}>Why ResourceShare is Different</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            
            <div style={{ padding: '30px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '40px', marginBottom: '15px' }}>🧠</div>
              <h3 style={{ fontSize: '20px', margin: '0 0 10px 0' }}>Smart Fair Allocation</h3>
              <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>No more First-Come-First-Serve. Our priority engine automatically evaluates group size, lead time, and usage history to ensure equitable access.</p>
            </div>

            <div style={{ padding: '30px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '40px', marginBottom: '15px' }}>🛡️</div>
              <h3 style={{ fontSize: '20px', margin: '0 0 10px 0' }}>Verified Trust Network</h3>
              <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>Every teacher and institution must upload official ID documents. A central Admin verifies every account before they can even request a resource.</p>
            </div>

            <div style={{ padding: '30px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '40px', marginBottom: '15px' }}>📸</div>
              <h3 style={{ fontSize: '20px', margin: '0 0 10px 0' }}>Condition Accountability</h3>
              <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>Built-in Check-In and Check-Out flows with mandatory photo documentation protect owners' property and hold users accountable for damages.</p>
            </div>
            
          </div>
        </div>
      </section>

      {/* THE END-TO-END FLOW */}
      <section id="how-it-works" style={{ padding: '80px 20px', backgroundColor: '#0f172a', color: 'white' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '60px' }}>The End-to-End Workflow</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ backgroundColor: '#38bdf8', color: '#0f172a', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '20px', flexShrink: 0 }}>1</div>
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '22px' }}>List & Discover</h3>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '16px' }}>Institutions (Owners) list their idle labs, buses, or halls. Verified teachers search and discover these resources city-wide.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ backgroundColor: '#38bdf8', color: '#0f172a', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '20px', flexShrink: 0 }}>2</div>
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '22px' }}>Automated Priority Check</h3>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '16px' }}>Teachers submit a request. The system instantly checks for scheduling conflicts, calculates a Priority Score, and auto-approves or waitlists based on fairness.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ backgroundColor: '#38bdf8', color: '#0f172a', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '20px', flexShrink: 0 }}>3</div>
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '22px' }}>Secure Check-In / Check-Out</h3>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '16px' }}>The teacher receives the item, uploads a photo of its condition, and checks it in. Upon return, a second photo is taken. Any overdue items are flagged red.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ backgroundColor: '#38bdf8', color: '#0f172a', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '20px', flexShrink: 0 }}>4</div>
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '22px' }}>Admin Oversight & Resolution</h3>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '16px' }}>If a scheduling conflict arises or damage occurs, the Admin steps in. Every single action is recorded in an immutable, global audit trail.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', color: '#64748b', fontSize: '14px' }}>
        <p>© 2026 ResourceShare Hackathon Project. Built for Educational Equity.</p>
      </footer>

    </div>
  )
}