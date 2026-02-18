import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import SalesPageContent from './sales page components/SalesPageContent';

export default function ProductPage() {
    const { slug } = useParams(); 
    const [salesPageData, setSalesPageData] = useState<any>(null);
    const [productMeta, setProductMeta] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        loadProduct();
    }, [slug]);

    async function loadProduct() {
        try {
            if (!slug) {
                setError('Invalid product link');
                return;
            }
            
            // Read from top-level published_pages collection
            const pageRef = doc(db, 'published_pages', slug);
            const snap = await getDoc(pageRef);
            
            if (!snap.exists()) {
                setError('Product not found');
                return;
            }

            const data = snap.data();
            
            // Check if published
            if (data.salesPage?.publish?.status !== 'published') {
                setError('Product is not available');
                return;
            }

            setSalesPageData(data.salesPage);
            setProductMeta({
                slug: snap.id,
                userId: data.userId,
                productId: data.productId,
            });
            
        } catch (err) {
            console.error('Error loading product:', err);
            setError('Failed to load product');
        } finally {
            setLoading(false);
        }
    }

    async function handlePurchase() {
        if (purchasing || !productMeta) return;
        setPurchasing(true);
        try {
            const response = await fetch('https://us-central1-launchpad-ec0b0.cloudfunctions.net/createCheckoutSession', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    slug: productMeta.slug,
                    sellerId: productMeta.userId,
                    productId: productMeta.productId,
                    origin: window.location.origin
                })
            });
            
            const data = await response.json();
            
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout');
            }
        } catch (err) {
            console.error('Error creating checkout:', err);
            alert('Unable to process payment. Please try again.');
        } finally {
            setPurchasing(false);
        }
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

    return (
        <SalesPageContent 
            data={salesPageData}
            onCtaClick={handlePurchase}
        />
    );
}