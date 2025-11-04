'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

type Step = {
  id: string;
  title: string;
  href?: string;
  help?: string;
  time?: string;
};

// Track A: "I Have a Product" (Fast Track)
const FAST_TRACK_STEPS: Step[] = [
  { 
    id: 'account', 
    title: 'Set up your account', 
    href: '/onboarding/account', 
    help: 'Add your name and profile to build trust with customers.',
    time: '2 min'
  },
  { 
    id: 'stripe', 
    title: 'Connect Stripe for payments', 
    href: '/onboarding/stripe', 
    help: 'Required to accept payments. Quick 3-minute setup.',
    time: '3 min'
  },
  { 
    id: 'salespage', 
    title: 'Build your sales page', 
    href: '/products/sales', 
    help: 'Create a compelling page that converts visitors into buyers.',
    time: '10 min'
  },
  { 
    id: 'content', 
    title: 'Add product content (optional)', 
    href: '/products/new/content', 
    help: 'Upload your content later - launch first!',
    time: 'Later'
  },
  { 
    id: 'publish', 
    title: 'Publish & start selling', 
    href: '/publish', 
    help: 'Go live and share your link immediately.',
    time: 'Now'
  },
];

// Track B: "Help Me Choose" (Guided Track)
const GUIDED_TRACK_STEPS: Step[] = [
  { 
    id: 'product-quiz', 
    title: 'Find your product idea', 
    href: '/product-idea-generator', 
    help: 'AI Co-Pilot analyzes your skills and suggests profitable ideas.',
    time: '5 min'
  },
  { 
    id: 'account', 
    title: 'Set up your account', 
    href: '/onboarding/account', 
    help: 'Add your name and profile to build trust with customers.',
    time: '2 min'
  },
  { 
    id: 'stripe', 
    title: 'Connect Stripe for payments', 
    href: '/onboarding/stripe', 
    help: 'Required to accept payments. Quick 3-minute setup.',
    time: '3 min'
  },
  { 
    id: 'salespage', 
    title: 'Build your sales page', 
    href: '/products/sales', 
    help: 'Create a compelling page that converts visitors into buyers.',
    time: '10 min'
  },
  { 
    id: 'content', 
    title: 'Add product content (optional)', 
    href: '/products/new/content', 
    help: 'Upload your content later - launch first!',
    time: 'Later'
  },
  { 
    id: 'publish', 
    title: 'Publish & start selling', 
    href: '/publish', 
    help: 'Go live and share your link immediately.',
    time: 'Now'
  },
];

const FAQ = [
  { 
    q: 'Why do I need to connect Stripe before building my sales page?', 
    a: 'We want you to launch the instant you finish building. No delays, no "oops, forgot to set up payments" moments. Connect Stripe once (3 minutes), then every product you create is ready to sell immediately. This is how we keep the "15 minutes to launch" promise.' 
  },
  { 
    q: 'Can I build my sales page without connecting Stripe?', 
    a: 'Not yet. We\'re optimizing for speed to launch. If you\'re not ready to accept payments, you can use the AI Product Idea Generator to plan your product first, then come back when you\'re ready to sell.' 
  },
  { 
    q: 'What if I don\'t know what to sell yet?', 
    a: 'Perfect! Click "Help Me Find My Product" and our AI Co-Pilot will analyze your skills, suggest profitable ideas, and help you choose. Then we\'ll guide you through the rest.' 
  },
  { 
    q: 'Do I need to add product content before publishing?', 
    a: 'Nope! You can publish your sales page immediately and add content later. Great for pre-orders or validating demand before you create everything.' 
  },
  { 
    q: 'What\'s the difference between sales page and content?', 
    a: 'Your sales page is what visitors see before buying (marketing copy, pricing, testimonials). Product content is what customers access after purchasing (videos, downloads, course materials).' 
  },
  { 
    q: 'How do payments work?', 
    a: 'Customers pay via Stripe Checkout directly into your account. You keep 100% of revenue (minus Stripe\'s 2.9% + $0.30 processing fee). No platform commissions.' 
  },
];

export default function Onboarding() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<{ total: number; last7: number; customers: number }>({ total: 0, last7: 0, customers: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<'fast' | 'guided'>('fast');
  const [productStatus, setProductStatus] = useState<{ 
    hasProducts: boolean; 
    hasSalesPage: boolean; 
    hasContent: boolean; 
    hasPublished: boolean;
    productId?: string;
    usedProductQuiz?: boolean;
  }>({ 
    hasProducts: false, 
    hasSalesPage: false, 
    hasContent: false, 
    hasPublished: false,
    usedProductQuiz: false
  });

  // Check actual completion status from Firestore
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Listen to user document for real-time updates
      const userRef = doc(db, 'users', user.uid);
      const unsubUser = onSnapshot(userRef, async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          // Check actual completion status
          let completed: Record<string, boolean> = {
            'product-quiz': !!data.usedProductQuiz,
            account: !!data.profileComplete,
            stripe: !!data.stripeConnected,
            salespage: false,
            content: false,
            publish: false,
          };

          // Check for products and their status
          try {
            const productsRef = collection(db, 'users', user.uid, 'products');
            const productsSnap = await getDocs(productsRef);
            
            if (!productsSnap.empty) {
              const firstProduct = productsSnap.docs[0];
              const productData = firstProduct.data();
              
              // Check for sales page completion
              if (productData.salesPage?.coreInfo?.name && productData.salesPage?.valueProp?.description) {
                completed.salespage = true;
              }
              
              // Check for content
              if (productData.content?.modules?.length > 0 || 
                  productData.content?.videos?.length > 0 ||
                  productData.content?.downloads?.length > 0) {
                completed.content = true;
              }
              
              // Check if published
              if (productData.salesPage?.status === 'published' || productData.published === true) {
                completed.publish = true;
              }

              setProductStatus({
                hasProducts: true,
                hasSalesPage: completed.salespage,
                hasContent: completed.content,
                hasPublished: completed.publish,
                productId: firstProduct.id,
                usedProductQuiz: !!data.usedProductQuiz
              });
              
              // Auto-detect which track user is on
              if (data.usedProductQuiz) {
                setSelectedTrack('guided');
              }
            }
          } catch (error) {
            console.error('Error checking products:', error);
          }

          setDone(completed);
        }
        setLoading(false);
      });

      return () => {
        unsubUser();
      };
    });

    return () => unsubAuth();
  }, []);

  // TODO: wire to Firestore/Stripe for real stats
  useEffect(() => setStats({ total: 0, last7: 0, customers: 0 }), []);

  const currentSteps = selectedTrack === 'fast' ? FAST_TRACK_STEPS : GUIDED_TRACK_STEPS;
  const completedCount = useMemo(() => {
    return currentSteps.filter(step => done[step.id]).length;
  }, [done, currentSteps]);
  const progressPct = Math.round((completedCount / currentSteps.length) * 100);

  // Calculate total time to launch
  const totalTime = selectedTrack === 'fast' ? '15 min' : '25 min';

  // Determine dynamic href based on product status
  const getStepHref = (step: Step) => {
    if (!step.href) return undefined;
    
    // If they have a product, update the URLs to edit existing product
    if (productStatus.productId) {
      switch (step.id) {
        case 'salespage':
          return `/products/${productStatus.productId}/landing/edit`;
        case 'content':
          return `/products/${productStatus.productId}/content`;
        case 'publish':
          return `/products/${productStatus.productId}/publish`;
        default:
          return step.href;
      }
    }
    
    return step.href;
  };

  // Calculate spots remaining (mock for now)
  const spotsRemaining = 37; // TODO: Calculate from actual customer count

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100">
      <div className="mx-auto max-w-7xl p-6 space-y-8">
        {/* Hero Section with Two Avatar CTAs */}
        <header className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-black to-neutral-900 p-8 md:p-12 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-fuchsia-500/5" />
          
          <div className="relative">
            {/* Early Access Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              First 50 Founders Ship-Fast Challenge
            </div>
            
            {/* Main Headline */}
            <h1 className="mt-6 text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
                Launch Your Digital Product in 15 Minutes
              </span>
            </h1>
            <p className="mt-4 text-xl md:text-2xl text-neutral-300 font-medium">
              Keep 100% of Your Revenue Forever
            </p>
            <p className="mt-3 text-base md:text-lg text-neutral-400 max-w-3xl">
              Whether you know exactly what to sell or you're still figuring it out, we'll help you launch today.
            </p>

            {/* Two Avatar CTAs */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
              {/* CTA 1: I Have a Product */}
              <a 
                href="/products/sales"
                className="group relative rounded-xl border-2 border-indigo-500/50 bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🚀</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">I Have a Product Ready</h3>
                    <p className="text-sm text-indigo-100 mb-3">"Launch in 15 minutes"</p>
                    <div className="inline-flex items-center gap-2 text-white font-medium">
                      Create Sales Page
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </a>

              {/* CTA 2: Help Me Find My Product */}
              <a 
                href="/product-idea-generator"
                className="group relative rounded-xl border-2 border-violet-500/50 bg-gradient-to-br from-violet-600 to-violet-700 p-6 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">💡</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">Help Me Find My Product</h3>
                    <p className="text-sm text-violet-100 mb-3">"Discover what to sell first"</p>
                    <div className="inline-flex items-center gap-2 text-white font-medium">
                      Start Product Quiz
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </a>
            </div>

            {/* Urgency + Social Proof */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              <div className="inline-flex items-center gap-2 text-amber-300">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{spotsRemaining} of 50 Founding Member spots left</span>
              </div>
            </div>
          </div>
        </header>

        {/* Value Stack Section */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 md:p-8 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">What You Get Today</h2>
            <p className="text-neutral-400">(First 50 Founders Only)</p>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            <ValueStackItem label="Core Platform: Sales Page Builder" value="$1,497" />
            <ValueStackItem label="Keep 100% of revenue (no commissions)" value="$0 fees forever" highlight />
            <ValueStackItem label="BONUS #1: AI Product Idea Generator" value="$1,291" badge="NEW" />
            <ValueStackItem label="BONUS #2: AI Sales Copywriter" value="$397" badge="NEW" />
            <ValueStackItem label="BONUS #3: Sales Page Review (Loom + Call)" value="$197" badge="First 50" />
            <ValueStackItem label="BONUS #4: Launch Day Promotion" value="$497" badge="First 50" />
            <ValueStackItem label="GUARANTEE: 15-Min Build-With-You Promise" value="Priceless" />
            <ValueStackItem label="GUARANTEE: $500 Value Pledge (30-day refund)" value="Zero risk" />
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-800">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              <div>
                <div className="text-sm text-neutral-400">Total Value:</div>
                <div className="text-3xl font-bold text-white">$18,158</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-neutral-400">Your Price (Founding Members):</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                  $29<span className="text-xl">/month</span>
                </div>
                <div className="text-xs text-neutral-500 mt-1">(Locked in forever)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Two-Track Comparison */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 md:p-8 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <h2 className="text-2xl font-bold text-center mb-6">Choose Your Starting Point</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Path 1: Launch Today */}
            <div className="rounded-xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-indigo-500/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🚀</span>
                <div>
                  <h3 className="text-xl font-bold">Path 1: Launch Today</h3>
                  <p className="text-sm text-neutral-400">Fast Track - 15 minutes</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="text-sm font-medium text-neutral-300">You have:</div>
                <ul className="space-y-2 text-sm text-neutral-400">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>Product idea ready</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>Know your audience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>Know your pricing</span>
                  </li>
                </ul>

                <div className="text-sm font-medium text-neutral-300 mt-4">We'll help you:</div>
                <ul className="space-y-2 text-sm text-neutral-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Create sales page (15 min)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Accept payments instantly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Deliver to customers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Launch same day</span>
                  </li>
                </ul>
              </div>

              <a 
                href="/products/sales"
                className="block w-full text-center rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Start Building →
              </a>
            </div>

            {/* Path 2: Discover First */}
            <div className="rounded-xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-violet-500/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💡</span>
                <div>
                  <h3 className="text-xl font-bold">Path 2: Discover First</h3>
                  <p className="text-sm text-neutral-400">Guided Track - 25 minutes</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="text-sm font-medium text-neutral-300">You need:</div>
                <ul className="space-y-2 text-sm text-neutral-400">
                  <li className="flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">•</span>
                    <span>Help choosing what to sell</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">•</span>
                    <span>Market validation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">•</span>
                    <span>Product structure guidance</span>
                  </li>
                </ul>

                <div className="text-sm font-medium text-neutral-300 mt-4">We'll help you:</div>
                <ul className="space-y-2 text-sm text-neutral-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Generate 5-10 product ideas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Analyze profitability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Pick your best option</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Create full outline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>THEN build sales page</span>
                  </li>
                </ul>
              </div>

              <a 
                href="/product-idea-generator"
                className="block w-full text-center rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500 transition-colors"
              >
                Find My Product →
              </a>
            </div>
          </div>
        </section>

        {/* Your Progress Checklist */}
        {!loading && (done.account || done.stripe || done.salespage) && (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Your Progress</h2>
                <p className="text-sm text-neutral-400">
                  {selectedTrack === 'fast' ? 'Fast Track' : 'Guided Track'} - {totalTime} to launch
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-neutral-400">{completedCount}/{currentSteps.length} steps</span>
                <button
                  onClick={() => setSelectedTrack(selectedTrack === 'fast' ? 'guided' : 'fast')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  Switch to {selectedTrack === 'fast' ? 'Guided' : 'Fast'} Track
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="h-2 w-full rounded-full bg-neutral-800">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-neutral-400">{progressPct}% complete</div>
            </div>

            {/* Steps List */}
            <ul className="space-y-3">
              {currentSteps.map((s, index) => {
                const isDone = !!done[s.id];
                const previousStepDone = index === 0 || done[currentSteps[index - 1].id];
                const isDisabled = !isDone && !previousStepDone;
                const href = getStepHref(s);
                const isOptional = s.id === 'content';
                
                return (
                  <li key={s.id} className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                    <div className={`mt-0.5 grid h-6 w-6 place-items-center rounded-lg border transition-all flex-shrink-0
                      ${isDone ? 'border-indigo-400 bg-indigo-500/20' : 'border-neutral-700 bg-neutral-900'}
                    `}>
                      {isDone ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-300" fill="none" stroke="currentColor" strokeWidth={3}>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <div className="h-2.5 w-2.5 rounded-sm bg-neutral-700" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${isDisabled && !isOptional ? 'text-neutral-500' : 'text-neutral-100'}`}>
                            {s.title}
                          </span>
                          {s.time && (
                            <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
                              {s.time}
                            </span>
                          )}
                          {isOptional && !isDone && (
                            <span className="text-[10px] text-neutral-500 italic">(optional)</span>
                          )}
                        </div>
                        
                        {href && !isDone && (!isDisabled || isOptional) && (
                          <a href={href} className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline whitespace-nowrap">
                            Start →
                          </a>
                        )}
                        {isDone && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-emerald-400 whitespace-nowrap">✓ Done</span>
                            {href && (
                              <a href={href} className="text-xs text-neutral-400 hover:text-neutral-200 hover:underline whitespace-nowrap">
                                Edit →
                              </a>
                            )}
                          </div>
                        )}
                        {isDisabled && !isOptional && (
                          <span className="text-xs text-neutral-600 whitespace-nowrap">Complete previous step</span>
                        )}
                      </div>
                      {s.help && <p className="mt-1 text-sm text-neutral-400">{s.help}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>

            {!loading && done.salespage && !done.publish && (
              <div className="mt-6">
                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                  <p className="text-sm text-indigo-200">
                    🚀 Ready to launch? You can publish your sales page now and add content later! Click the <strong className="text-white">Dashboard</strong> link above to manage your products.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Why Setup First Section */}
        <section className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 md:p-8 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <h2 className="text-xl font-bold text-center mb-6">Why We Ask for Setup First (Before You Build)</h2>
          
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-xl flex-shrink-0">❌</span>
                <div>
                  <div className="font-medium text-red-300 mb-1">Most platforms:</div>
                  <p className="text-sm text-neutral-300">
                    Build → Setup payments → Realize you can't publish yet → Get frustrated
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 text-xl flex-shrink-0">✅</span>
                <div>
                  <div className="font-medium text-emerald-300 mb-1">LaunchPad:</div>
                  <p className="text-sm text-neutral-300">
                    Account + Stripe FIRST → Build sales page → Click publish. Done.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              <div className="text-center">
                <div className="font-medium text-indigo-300 mb-2">💡 Why?</div>
                <p className="text-sm text-neutral-300">
                  Because when you finish your sales page in 15 minutes, you want to <strong className="text-white">LAUNCH IMMEDIATELY</strong>. No delays. No "set up payments" screens. Just click publish.
                </p>
                <p className="text-xs text-neutral-400 mt-2">
                  This is how we keep the "15 minutes to launch" promise.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Stats Snapshot - Only show if published */}
        {productStatus.hasPublished && (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live Stats Snapshot</h2>
              <span className="text-xs text-neutral-400">Auto-updates after payments</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total Revenue" value={`$${stats.total.toFixed(2)}`} />
              <StatCard label="Last 7 Days" value={`$${stats.last7.toFixed(2)}`} />
              <StatCard label="Customers" value={stats.customers.toString()} />
            </div>
          </section>
        )}

        {/* FAQs */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="divide-y divide-neutral-800">
            {FAQ.map((f, i) => (
              <details key={i} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span className="font-medium text-neutral-100">{f.q}</span>
                  <svg
                    className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p className="mt-3 text-neutral-300 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="/support" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
              Get Help
            </a>
            <a href="/docs" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800">
              View Documentation
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-neutral-100">{value}</div>
    </div>
  );
}

function ValueStackItem({ 
  label, 
  value, 
  highlight = false, 
  badge 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      highlight 
        ? 'border-emerald-500/30 bg-emerald-500/10' 
        : 'border-neutral-800 bg-neutral-950/50'
    }`}>
      <div className="flex items-center gap-3">
        <svg className={`w-5 h-5 flex-shrink-0 ${highlight ? 'text-emerald-400' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className={`text-sm ${highlight ? 'text-emerald-100 font-medium' : 'text-neutral-300'}`}>
          {label}
        </span>
        {badge && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {badge}
          </span>
        )}
      </div>
      <span className={`text-sm font-medium ${highlight ? 'text-emerald-300' : 'text-neutral-400'}`}>
        {value}
      </span>
    </div>
  );
}