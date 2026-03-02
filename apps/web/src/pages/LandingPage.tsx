import { useNavigate } from 'react-router-dom';
import { Compass, PenTool, Rocket, ArrowRight} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const steps = [
    {
      icon: Compass,
      number: '1',
      title: 'Discover Your Idea',
      description: 'Answer 10 guided questions about your skills and experience. The Product Pathfinder helps you uncover a product your audience actually wants.',
      accent: 'from-amber-500/20 to-orange-500/20',
      accentBorder: 'border-amber-700/30',
      accentText: 'text-amber-400',
      accentBg: 'bg-amber-500/10',
    },
    {
      icon: PenTool,
      number: '2',
      title: 'Build Your Sales Page',
      description: 'Your Pathfinder answers automatically fill in your sales page. Customize the design to match your brand. No design skills needed.',
      accent: 'from-purple-500/20 to-indigo-500/20',
      accentBorder: 'border-purple-700/30',
      accentText: 'text-purple-400',
      accentBg: 'bg-purple-500/10',
    },
    {
      icon: Rocket,
      number: '3',
      title: 'Launch & Start Selling',
      description: 'Connect Stripe, hit publish, and share your link. Deliver ebooks, courses, coaching sessions, or host content directly on the platform.',
      accent: 'from-emerald-500/20 to-teal-500/20',
      accentBorder: 'border-emerald-700/30',
      accentText: 'text-emerald-400',
      accentBg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-indigo-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-amber-500/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Top navigation bar */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Launch<span className="text-purple-400">Pad</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/auth/signin')}
          className="text-sm text-neutral-400 hover:text-white transition-colors font-medium"
        >
          Sign in
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
          <span className="bg-gradient-to-b from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            Find your perfect
          </span>
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            product idea
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          You have skills people need. The Product Pathfinder helps you turn them into 
          a digital product you can sell in about 15 minutes. 
          No tech skills required.
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => navigate("/auth/signin")}
            className="group relative"
          >
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 opacity-60 blur-lg group-hover:opacity-80 transition-opacity" />
            <div className="relative flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold text-lg shadow-xl transition-all duration-200 hover:-translate-y-0.5">
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
          <p className="text-sm text-purple-400/70 ">
            Your first 5 sales are free. 
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold">
            <span className="bg-gradient-to-b from-white to-neutral-300 bg-clip-text text-transparent">
              From Idea to Income in Three Steps.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group relative"
              >
                {/* Card */}
                <div className={`relative h-full rounded-2xl border ${step.accentBorder} bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/[0.03]`}>
                  {/* Step number */}
                  <span className="text-xs font-mono text-neutral-600 mb-4 block">{step.number}</span>
                  
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${step.accentBg} flex items-center justify-center mb-5`}>
                    <Icon className={`w-6 h-6 ${step.accentText}`} />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-neutral-400 leading-relaxed text-[15px]">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-neutral-800/50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm text-neutral-500">LaunchPad</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <a href="/terms" className="hover:text-neutral-300 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-neutral-300 transition-colors">Privacy</a>
            <a href="/auth/signin" className="hover:text-neutral-300 transition-colors">Sign in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}