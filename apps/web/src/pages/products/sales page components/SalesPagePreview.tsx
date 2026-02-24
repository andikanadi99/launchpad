import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import SalesPageContent from './SalesPageContent';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SalesPagePreview() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [salesPageData, setSalesPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      if (!auth.currentUser || !productId) {
        navigate('/auth/signin');
        return;
      }

      try {
        const productRef = doc(db, 'users', auth.currentUser.uid, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data();
          if (data.salesPage) {
            setSalesPageData(data.salesPage);
          } else {
            console.error('No sales page data found');
          }
        } else {
          console.error('Product not found');
        }
      } catch (error) {
        console.error('Error loading preview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading preview...</div>
      </div>
    );
  }

  if (!salesPageData) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-400 mb-4">Sales page preview not available</div>
          <Link
            to="/dashboard"
            className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-2 justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 relative">
      {/* Subtle floating preview badge */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-neutral-900/90 backdrop-blur-sm border border-neutral-700 rounded-full shadow-lg">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs text-neutral-300 font-medium">Preview Mode</span>
        <button
          onClick={() => navigate(-1)}
          className="ml-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Sales Page Content */}
      <SalesPageContent 
        data={salesPageData}
        onCtaClick={() => {
          alert('Preview Mode\n\nButtons are disabled in preview. Publish your page to enable purchases.');
        }}
      />
    </div>
  );
}