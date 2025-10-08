import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import SalesPageContent from './SalesPageContent';
import { Eye, X, Edit } from 'lucide-react';
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
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5" />
            <div>
              <div className="font-semibold">Sales Page Preview</div>
              <div className="text-xs text-purple-100">
                This is what customers see BEFORE purchasing
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              to={`/products/${productId}/landing/edit`}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Sales Page
            </Link>
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sales Page Content */}
      <SalesPageContent 
        data={salesPageData}
        onCtaClick={() => {
          alert('⚠️ Sales Page Preview\n\nCTA buttons are disabled in preview mode. Publish your page to make them functional.');
        }}
      />
    </div>
  );
}