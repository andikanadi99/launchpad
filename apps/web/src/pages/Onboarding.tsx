import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { Rocket, Zap, BookOpen, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function Onboarding() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [selectedPath, setSelectedPath] = useState<'fast' | 'guided' | null>(null);
  const [productStatus, setProductStatus] = useState({
    hasSalesPage: false,
    productId: null as string | null,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        
        
        // If they already selected a path, show it
        if (data.onboardingPath) {
          setSelectedPath(data.onboardingPath);
        }

        // Check if they already have a product
        const productsRef = collection(db, 'users', auth.currentUser.uid, 'products');
        const productsSnap = await getDocs(productsRef);
        
        if (!productsSnap.empty) {
          const firstProduct = productsSnap.docs[0];
          const productData = firstProduct.data();
          
          setProductStatus({
            hasSalesPage: !!(productData.salesPage?.coreInfo?.name),
            productId: firstProduct.id,
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function selectPath(path: 'fast' | 'guided') {
    if (!auth.currentUser) return;
    
    setSelectedPath(path);
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        onboardingPath: path,
        lastActiveDate: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error saving path:', error);
    }
  }

  async function startBuilding() {
    if (!auth.currentUser || !selectedPath) return;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        onboardingComplete: true,
      });
      
      // Route based on selected path
      if (selectedPath === 'guided') {
        // Guided path - go to Product Idea Co-Pilot
        nav('/product-idea-copilot');
      } else if (productStatus.productId) {
        // Fast track with existing product - edit it
        nav(`/products/${productStatus.productId}/landing/edit`);
      } else {
        // Fast track - create new
        nav('/products/sales');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0B0D] flex items-center justify-center">
        <div className="text-neutral-600 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-neutral-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/30 dark:to-purple-500/30 mb-6">
            <Rocket className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-neutral-900 dark:text-white">
            Welcome to LaunchPad! 🎉
          </h1>
          
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-2">
            You're minutes away from launching your first digital product.
          </p>
          
          <div className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-full">
            <Sparkles className="w-4 h-4" />
            <span>Free account • No credit card required</span>
          </div>
        </div>

        {/* Path Selection or Confirmation */}
        {!selectedPath ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2 text-neutral-900 dark:text-white">
                Choose your starting point
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Pick the path that fits your needs best
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Fast Track */}
              <button
                onClick={() => selectPath('fast')}
                className="group relative p-8 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-neutral-900/50 transition-all duration-200 text-left hover:shadow-xl"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/20 dark:from-indigo-500/20 dark:to-indigo-600/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-neutral-900 dark:text-white">
                      Fast Track
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      I know what I want to sell. Let me build and launch quickly.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2.5 mb-6">
                  <div className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Jump straight to sales page builder</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>5-step guided process</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Live preview as you build</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    ~15 minutes
                  </span>
                  <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Guided Path */}
              <button
                onClick={() => selectPath('guided')}
                className="group relative p-8 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 hover:border-purple-500 dark:hover:border-purple-500 bg-white dark:bg-neutral-900/50 transition-all duration-200 text-left hover:shadow-xl"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/20 dark:from-purple-500/20 dark:to-purple-600/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-neutral-900 dark:text-white">
                      Guided Journey
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Help me figure out what to create and how to structure it.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2.5 mb-6">
                  <div className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Product AI Co-Pilot</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Step-by-step guidance</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Best practice tips</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    ~20 minutes
                  </span>
                  <ArrowRight className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </>
        ) : (
          /* Selected Path Confirmation */
          <div className="max-w-2xl mx-auto">
            <div className={`p-8 rounded-2xl border-2 ${
              selectedPath === 'fast'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                : 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
            } mb-8`}>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedPath === 'fast'
                    ? 'bg-indigo-600'
                    : 'bg-purple-600'
                }`}>
                  {selectedPath === 'fast' ? (
                    <Zap className="w-6 h-6 text-white" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Guided Journey</h3>
                  <p className="text-neutral-400 mb-6">Let's discover your perfect product idea together! Here's what happens next:</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <StepItem 
                  number={1} 
                  text="Product Idea Co-Pilot - Discover your winning product idea" 
                />
                <StepItem 
                  number={2} 
                  text="Fill in your product details (name, price, description)" 
                />
                <StepItem 
                  number={3} 
                  text="Choose your value proposition and benefits with Guided Sales Copywriter" 
                />
                <StepItem 
                  number={4} 
                  text="Add visuals and customize the design" 
                />
                <StepItem 
                  number={5} 
                  text="Preview your page and make final tweaks" 
                />
                <StepItem 
                  number={6} 
                  text="Save as draft (publish when ready to accept payments)" 
                />
              </div>

              <button
                onClick={startBuilding}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                  selectedPath === 'fast'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                <span>Start Building Your Sales Page</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => setSelectedPath(null)}
                className="w-full mt-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
              >
                ← Choose a different path
              </button>
            </div>

            {/* Quick tip */}
            <div className="text-center p-4 rounded-lg bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                💡 <strong className="text-neutral-900 dark:text-neutral-200">Tip:</strong> You can save your progress at any time and come back later. No rush!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white dark:bg-neutral-900 border-2 border-current flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
        {number}
      </div>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed pt-1">
        {text}
      </p>
    </div>
  );
}