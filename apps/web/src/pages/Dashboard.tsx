import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function Dashboard() {
 const [products, setProducts] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   if (!auth.currentUser) return;

   const productsRef = collection(db, 'users', auth.currentUser.uid, 'products');
   const q = query(productsRef);
   
   const unsubscribe = onSnapshot(q, (snapshot) => {
     const items = snapshot.docs.map(doc => ({
       id: doc.id,
       ...doc.data()
     }));
     setProducts(items);
     setLoading(false);
   });

   return () => unsubscribe();
 }, []);

 

 if (loading) return (
   <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
     <div className="text-neutral-400">Loading...</div>
   </div>
 );

 function copyProductLink(productId: string) {
   const url = `${window.location.origin}/p/${auth.currentUser?.uid}/${productId}`;
   navigator.clipboard.writeText(url);
   
   // Visual feedback
   const button = document.getElementById(`copy-${productId}`);
   if (button) {
     const originalText = button.textContent;
     button.textContent = 'Copied!';
     setTimeout(() => {
       button.textContent = originalText;
     }, 2000);
   }
 }

 async function togglePublish(productId: string, currentStatus: boolean) {
  try {
    const productRef = doc(db, 'users', auth.currentUser!.uid, 'products', productId);
    await updateDoc(productRef, {
      published: !currentStatus
    });
  } catch (error) {
    console.error('Error updating publish status:', error);
  }
}

 return (
   <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
     <div className="mx-auto max-w-6xl">
       <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-semibold">Your Products</h1>
         <Link
           to="/products/new"
           className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500"
         >
           Add Product
         </Link>
       </div>
       
       {products.length === 0 ? (
         <div className="text-center py-12">
           <p className="text-neutral-400 mb-4">No products yet</p>
           <Link 
             to="/products/new"
             className="text-indigo-400 hover:text-indigo-300"
           >
             Create your first product →
           </Link>
         </div>
       ) : (
         <div className="grid gap-4">
           {products.map(product => (
             <div key={product.id} className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/50">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <h3 className="text-xl font-semibold">{product.title}</h3>
                   <p className="text-neutral-400">${(product.price / 100).toFixed(2)}</p>
                   <p className="text-sm text-neutral-500 mt-1">
                     {product.published ? '🟢 Published' : '⚫ Draft'}
                   </p>
                 </div>
               </div>
               
               {/* Share Link Section */}
               <div className="bg-neutral-950 rounded-lg p-3 mb-4">
                 <p className="text-xs text-neutral-400 mb-2">Customer Link:</p>
                 <div className="flex gap-2">
                   <input
                     readOnly
                     value={`${window.location.origin}/p/${auth.currentUser?.uid}/${product.id}`}
                     className="flex-1 bg-transparent text-sm text-neutral-300 outline-none"
                   />
                   <button
                     id={`copy-${product.id}`}
                     onClick={() => copyProductLink(product.id)}
                     className="text-sm px-3 py-1 bg-indigo-600 rounded hover:bg-indigo-500"
                   >
                     Copy
                   </button>
                   <a
                     href={`/p/${auth.currentUser?.uid}/${product.id}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-sm px-3 py-1 bg-neutral-700 rounded hover:bg-neutral-600"
                   >
                     View
                   </a>
                 </div>
               </div>

               {/* Actions */}
               <div className="flex gap-2">
                 <button className="text-sm text-neutral-400 hover:text-neutral-200">
                   Edit Product
                 </button>
                 <button className="text-sm text-neutral-400 hover:text-neutral-200">
                   View Stats
                 </button>
                 <button 
                  onClick={() => togglePublish(product.id, product.published)}
                  className={`text-sm ${product.published ? 'text-yellow-400' : 'text-green-400'} hover:opacity-80`}
                >
                  {product.published ? 'Unpublish' : 'Publish'}
                </button>
               </div>
             </div>
           ))}
         </div>
       )}
     </div>
   </div>
 );
}