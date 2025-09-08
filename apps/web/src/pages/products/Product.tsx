import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export default function ProductPage() {
    const { userId, productId } = useParams(); 
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        loadProduct();
    }, [userId, productId]);

    async function loadProduct() {
        try {
            if (!userId || !productId) {
                setError('Invalid product link');
                return;
            }
            
            const productRef = doc(db, 'users', userId, 'products', productId);
            const snap = await getDoc(productRef);
            
            if (!snap.exists()) {
                setError('Product not found');
                return;
            }

            const data = snap.data();
            
            if (!data.published) {
                setError('Product is not available');
                return;
            }

            setProduct({ id: snap.id, ...data });
            
            updateDoc(productRef, { views: increment(1) }).catch(console.error);
            
        } catch (error) {
            console.error('Error loading product:', error);
            setError('Failed to load product');
        } finally {
            setLoading(false);
        }
    }

    async function handlePurchase() {
        setPurchasing(true);
        try {
            const response = await fetch('https://us-central1-launchpad-ec0b0.cloudfunctions.net/createCheckoutSession', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    productId: productId,
                    sellerId: userId,
                    origin: window.location.origin
                })
            });
            
            const data = await response.json();
            
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout');
            }
        } catch (error) {
            console.error('Error creating checkout:', error);
            alert('Unable to process payment. Please try again.');
        } finally {
            setPurchasing(false);
        }
    }

    // Format content for display
    function formatForDisplay(content: string): string {
        let formatted = content
            .replace(/^#{1}\s+(.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2 text-neutral-100">$1</h1>')
            .replace(/^#{2}\s+(.+)$/gm, '<h2 class="text-xl font-semibold mt-3 mb-2 text-neutral-200">$1</h2>')
            .replace(/^#{3}\s+(.+)$/gm, '<h3 class="text-lg font-medium mt-2 mb-1 text-neutral-300">$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong class="text-neutral-100">$1</strong>')
            .replace(/^-\s+(.+)$/gm, '<li class="ml-4">$1</li>')
            .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-4">$2</li>');
        
        formatted = formatted.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, 
            '<ul class="list-disc list-inside space-y-1 text-neutral-300 my-2">$&</ul>');
        
        return formatted;
    }

    if (loading) return (
        <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
            <div className="text-neutral-400">Loading...</div>
        </div>
    );
        
    if (error) return (
        <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
            <div className="text-red-400">{error}</div>
        </div>
    );

    // Dynamic color based on product setting
    const themeColor = product.color || 'green';
    const colorClasses = {
        green: 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 border-green-800/30',
        blue: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-blue-800/30',
        purple: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-purple-800/30',
        red: 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 border-red-800/30'
    };

    return (
        <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
            <div className="mx-auto max-w-4xl">
                {/* Hero Section */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">{product.title}</h1>
                    <p className="text-xl text-neutral-300">{product.description}</p>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap gap-6 mb-8 text-sm">
                    <span className="flex items-center gap-2 text-neutral-400">
                        <span className="text-2xl">👁</span>
                        <span>{product.views || 0} people viewed this</span>
                    </span>
                    {product.sales > 0 && (
                        <span className="flex items-center gap-2 text-green-400">
                            <span className="text-2xl">🔥</span>
                            <span>{product.sales} already purchased</span>
                        </span>
                    )}
                    <span className="flex items-center gap-2 text-neutral-400">
                        <span className="text-2xl">⚡</span>
                        <span>Instant access</span>
                    </span>
                </div>

                {/* Urgency Message */}
                {product.urgency && (
                    <div className="mb-8 p-4 bg-yellow-950/20 border border-yellow-800/30 rounded-lg">
                        <p className="text-yellow-400 font-medium flex items-center gap-2">
                            <span>⏰</span>
                            {product.urgency === 'limited' && 'Limited spots available - only a few left!'}
                            {product.urgency === 'price' && 'Price increases soon - lock in this rate now'}
                            {product.urgency === 'bonus' && 'Special bonus expires at midnight tonight'}
                        </p>
                    </div>
                )}

                {/* Video Section */}
                {product.videoUrl && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">Watch This First 👇</h2>
                        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                            <iframe
                                src={product.videoUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Product Video"
                            />
                        </div>
                    </div>
                )}

                {/* Features */}
                {product.features && product.features.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">What You Get</h2>
                        <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800">
                            <ul className="space-y-3">
                                {product.features.map((feature: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="text-green-400 text-xl mt-0.5">✓</span>
                                        <span className="text-lg">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Testimonial */}
                {product.testimonial && (
                    <div className="mb-8 p-6 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-lg border border-neutral-800">
                        <p className="text-lg italic text-neutral-300 mb-2">"{product.testimonial}"</p>
                        <p className="text-sm text-neutral-500">— Happy Customer</p>
                    </div>
                )}

                {/* Content Preview */}
                {product.content && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">Preview</h2>
                        <div className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/50 relative">
                            <div 
                                className="prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ 
                                    __html: formatForDisplay(product.content.substring(0, 1000)) 
                                }}
                            />
                            {product.content.length > 1000 && (
                                <>
                                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-900 to-transparent" />
                                    <div className="relative mt-8 p-6 bg-neutral-950 rounded-lg text-center">
                                        <span className="text-3xl mb-2 block">🔒</span>
                                        <p className="text-neutral-300 font-medium">
                                            Full content unlocked after purchase
                                        </p>
                                        <p className="text-sm text-neutral-500 mt-1">
                                            {Math.round(product.content.length / 5)} words of actionable content
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* What Happens Next */}
                <div className="mb-12 p-6 bg-neutral-900/50 rounded-lg border border-neutral-800">
                    <h3 className="text-xl font-semibold mb-4">What Happens After You Buy?</h3>
                    <ol className="space-y-3 text-neutral-300">
                        <li className="flex gap-3">
                            <span className="text-green-400 font-bold">1.</span>
                            <span>Secure checkout through Stripe (takes 30 seconds)</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-green-400 font-bold">2.</span>
                            <span>Instant redirect to your content (no waiting)</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-green-400 font-bold">3.</span>
                            <span>Lifetime access - review anytime you want</span>
                        </li>
                    </ol>
                </div>

                {/* Social Proof for high sales */}
                {product.sales >= 5 && (
                    <div className="mb-8 p-4 bg-green-950/20 border border-green-800/30 rounded-lg text-center">
                        <p className="text-green-400 font-medium">
                            🔥 {product.sales} people already getting results with this
                        </p>
                    </div>
                )}

                {/* Purchase Card - Sticky on desktop */}
                <div className={`border rounded-lg p-6 bg-gradient-to-br from-neutral-900/90 to-neutral-950 lg:sticky lg:top-6 ${colorClasses[themeColor].split(' ')[2]}`}>
                    <div className="text-4xl font-bold mb-2">
                        ${(product.price / 100).toFixed(2)}
                    </div>
                    <p className="text-sm text-neutral-400 mb-4">One-time payment</p>
                    
                    <button
                        onClick={handlePurchase}
                        disabled={purchasing}
                        className={`w-full rounded-lg bg-gradient-to-r ${colorClasses[themeColor].split(' ').slice(0, 2).join(' ')} py-4 text-white font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100`}
                    >
                        {purchasing ? 'Processing...' : 'Get Instant Access →'}
                    </button>
                    
                    <div className="mt-4 space-y-2 text-sm text-neutral-400">
                        <p className="flex items-center gap-2">
                            <span className="text-green-400">✓</span>
                            Secure payment via Stripe
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="text-green-400">✓</span>
                            Instant access after payment
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="text-green-400">✓</span>
                            {product.guarantee || '30-day money-back guarantee'}
                        </p>
                    </div>
                </div>

                {/* Product Type Badge */}
                {product.type && (
                    <div className="mt-8 text-center">
                        <span className="inline-block px-4 py-2 rounded-full bg-neutral-800 text-sm">
                            {product.type}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}