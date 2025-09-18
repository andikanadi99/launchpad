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
};

const STEPS: Step[] = [
  { 
    id: 'account', 
    title: 'Set up your account', 
    href: '/onboarding/account', 
    help: 'Add your name and profile to build trust with customers.' 
  },
  { 
    id: 'stripe', 
    title: 'Connect Stripe for payments', 
    href: '/onboarding/stripe', 
    help: 'Accept payments securely. Takes 2-3 minutes.' 
  },
  { 
    id: 'salespage', 
    title: 'Create your sales page', 
    href: '/products/new/landing', 
    help: 'Design a compelling page that converts visitors into buyers.'
  },
  { 
    id: 'content', 
    title: 'Add product content', 
    href: '/products/new/content', 
    help: 'Upload your course videos, PDFs, or written content.' 
  },
  { 
    id: 'publish', 
    title: 'Publish & start selling', 
    href: '/publish', 
    help: 'Go live and share your link to start earning.'
  },
];

const FAQ = [
  { 
    q: 'What\'s the difference between sales page and content?', 
    a: 'Your sales page is what visitors see before buying (marketing copy, pricing, testimonials). Product content is what customers access after purchasing (videos, downloads, course materials).' 
  },
  { 
    q: 'Can I publish without adding content first?', 
    a: 'Yes! You can launch your sales page immediately and add content later. Perfect for pre-orders or validating demand before creating all your content.' 
  },
  { 
    q: 'Why connect Stripe first?', 
    a: 'Connecting Stripe upfront means your products are ready to sell immediately. No delays when you want to publish.' 
  },
  { 
    q: 'How do payments work?', 
    a: 'Customers pay via Stripe Checkout. You receive payouts weekly after a 7-day holding period.' 
  },
  { 
    q: 'What happens after a customer pays?', 
    a: 'They instantly get access to any content you\'ve uploaded. If content isn\'t ready yet, they\'ll be notified when it\'s available.' 
  },
];

export default function Home() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<{ total: number; last7: number; customers: number }>({ total: 0, last7: 0, customers: 0 });
  const [loading, setLoading] = useState(true);
  const [productStatus, setProductStatus] = useState<{ 
    hasProducts: boolean; 
    hasSalesPage: boolean; 
    hasContent: boolean; 
    hasPublished: boolean;
    productId?: string;
  }>({ 
    hasProducts: false, 
    hasSalesPage: false, 
    hasContent: false, 
    hasPublished: false 
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
              if (productData.salesPage?.title && productData.salesPage?.description) {
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
                productId: firstProduct.id
              });
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

  const completedCount = useMemo(() => Object.values(done).filter(Boolean).length, [done]);
  const progressPct = Math.round((completedCount / STEPS.length) * 100);

  // Determine dynamic href based on product status
  const getStepHref = (step: Step) => {
    if (!step.href) return undefined;
    
    // If they have a product, update the URLs to edit existing product
    if (productStatus.productId) {
      switch (step.id) {
        case 'salespage':
          return productStatus.hasSalesPage 
            ? `/products/${productStatus.productId}/landing/edit`
            : `/products/${productStatus.productId}/landing`;
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

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100">
      <div className="mx-auto max-w-6xl p-6 space-y-8">
        {/* Welcome / Early Access */}
        <header className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-black p-6 md:p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700/80 bg-neutral-900/70 px-3 py-1 text-[11px] font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Early Access
          </div>
          <h1 className="mt-4 text-2xl md:text-3xl font-semibold">Welcome to LaunchPad 👋</h1>
          <p className="mt-2 text-neutral-300">
            Build your sales page, add your content, and start selling digital products in minutes. 
            Follow our proven 5-step process to launch today.
          </p>
          {productStatus.hasSalesPage && !productStatus.hasPublished && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
              <span className="text-amber-400 text-sm">💡 Tip:</span>
              <span className="text-sm text-amber-100">You can publish your sales page now and add content later!</span>
            </div>
          )}
        </header>

        {/* Grid: Checklist + Video */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Quick Start Checklist */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Quick Start Checklist</h2>
              <span className="text-sm text-neutral-400">{completedCount}/{STEPS.length} done</span>
            </div>

            {/* Progress */}
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-neutral-800">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                  aria-label="Progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPct}
                  role="progressbar"
                />
              </div>
              <div className="mt-1 text-xs text-neutral-400">{progressPct}% complete</div>
            </div>

            {loading ? (
              <div className="mt-5 text-neutral-400">Loading your progress...</div>
            ) : (
              <ul className="mt-5 space-y-3">
                {STEPS.map((s) => {
                  const isDone = !!done[s.id];
                  // Determine if step should be disabled (previous steps not complete)
                  const stepIndex = STEPS.findIndex(step => step.id === s.id);
                  const isDisabled = stepIndex > 0 && !done[STEPS[stepIndex - 1].id];
                  const href = getStepHref(s);
                  
                  // Special case: content can be done after publish
                  const isContentOptional = s.id === 'content' && done.salespage;
                  
                  return (
                    <li key={s.id} className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                      <div className={`mt-0.5 grid h-6 w-6 place-items-center rounded-lg border transition-all
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
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isDisabled && !isContentOptional ? 'text-neutral-500' : 'text-neutral-100'}`}>
                              {s.title}
                            </span>
                            {isContentOptional && !isDone && (
                              <span className="text-[10px] text-neutral-400 italic">(optional)</span>
                            )}
                          </div>
                          {href && !isDone && (!isDisabled || isContentOptional) && (
                            <a href={href} className="text-sm text-neutral-400 hover:text-neutral-200 hover:underline">
                              Start →
                            </a>
                          )}
                          {isDone && (
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-emerald-400">✓ Done</span>
                              {href && (
                                <a href={href} className="text-xs text-neutral-400 hover:text-neutral-200 hover:underline">
                                  Edit →
                                </a>
                              )}
                            </div>
                          )}
                          {isDisabled && !isContentOptional && (
                            <span className="text-xs text-neutral-600">Complete previous step</span>
                          )}
                        </div>
                        {s.help && <p className="mt-1 text-sm text-neutral-400">{s.help}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && done.salespage && (
              <div className="mt-6 space-y-3">
                {!done.publish && (
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                    <p className="text-sm text-indigo-200">
                      🚀 Ready to launch? You can publish your sales page now and add content later!
                    </p>
                  </div>
                )}
                <a 
                  href="/dashboard" 
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go to Dashboard
                </a>
              </div>
            )}
          </div>

          {/* Video Walkthrough */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
            <h2 className="text-lg font-semibold">5–7 min Walkthrough</h2>
            <p className="mt-1 text-sm text-neutral-400">See the new sales page builder in action.</p>
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 ring-1 ring-black/40 bg-neutral-950">
              <iframe
                className="h-full w-full"
                src="https://www.loom.com/embed/your-video-id"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title="LaunchPad Sales Page Builder Demo"
              />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <p className="text-sm text-neutral-300">Build compelling sales pages</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <p className="text-sm text-neutral-300">Launch before content is ready</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <p className="text-sm text-neutral-300">Add videos & downloads anytime</p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Stats Snapshot */}
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

        {/* FAQs */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <h2 className="text-lg font-semibold">FAQs & Fix-it</h2>
          <div className="mt-4 divide-y divide-neutral-800">
            {FAQ.map((f, i) => (
              <details key={i} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span className="font-medium text-neutral-100">{f.q}</span>
                  <svg
                    className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p className="mt-2 text-neutral-300">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href="/support" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
              Get Help
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