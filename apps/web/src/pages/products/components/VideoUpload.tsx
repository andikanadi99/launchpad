import { useState } from 'react';
import { storage, db } from '../../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { arrayUnion, updateDoc, doc } from 'firebase/firestore';

export default function VideoUpload({ productId, userId }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videos, setVideos] = useState([]);

  const handleVideoUpload = (file) => {
    // Validate file
    if (file.size > 500 * 1024 * 1024) { // 500MB limit
      alert('File too large. Maximum 500MB per video.');
      return;
    }

    const storageRef = ref(storage, `products/${userId}/${productId}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploading(true);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        // Save to Firestore
        const productRef = doc(db, 'users', userId, 'products', productId);
        await updateDoc(productRef, {
          videos: arrayUnion({
            name: file.name,
            url: downloadURL,
            size: file.size,
            uploadedAt: new Date()
          })
        });

        setVideos([...videos, { name: file.name, url: downloadURL }]);
        setUploading(false);
        setProgress(0);
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleVideoUpload(e.target.files[0])}
          disabled={uploading}
          className="hidden"
          id="video-upload"
        />
        <label htmlFor="video-upload" className="cursor-pointer">
          {uploading ? (
            <div>
              <div className="text-sm text-neutral-400">Uploading... {Math.round(progress)}%</div>
              <div className="w-full bg-neutral-800 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-2xl">🎥</span>
              <p className="mt-2">Click to upload video (max 500MB)</p>
            </div>
          )}
        </label>
      </div>

      {/* List uploaded videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((video, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-neutral-900 rounded">
              <span className="text-sm">{video.name}</span>
              <button className="text-xs text-red-400">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}