import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const UploadPage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // Validate file count (max 70)
    if (files.length > 70) {
      setMessage('Maximum 70 files allowed at once');
      return;
    }

    // Validate individual file sizes (max 100MB each)
    const oversizedFiles = files.filter(file => file.size > 104857600);
    if (oversizedFiles.length > 0) {
      setMessage(`Some files are too large. Maximum size is 100MB per file.`);
      return;
    }

    // Validate total upload size (max 150MB total)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 157286400) {
      const totalMB = (totalSize / 1048576).toFixed(1);
      setMessage(`Total upload size is ${totalMB}MB. Maximum total size is 150MB.`);
      return;
    }

    setSelectedFiles(files);
    setMessage('');

    // Create previews for all files
    const previewPromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ file: file.name, url: e.target.result });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then(setPreviews);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setMessage('Please select at least one photo to upload');
      return;
    }

    try {
      setUploading(true);
      setMessage('');

      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await api.post('/photos/upload/bulk/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage(response.data.message);

      // Reset form
      setSelectedFiles([]);
      setPreviews([]);
      document.getElementById('photo-input').value = '';

      // Redirect to profile after 2 seconds
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Error uploading photos. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Upload Photos
        </h1>
        <p className="text-lg text-gray-600">
          Share your best photos with the community (up to 70 at once)
        </p>
      </div>

      <div className="card">
        <div className="p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg text-center ${
              message.includes('Error')
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label htmlFor="photo-input" className="block text-sm font-medium text-gray-700 mb-2">
                Choose Photo
              </label>
              <input
                type="file"
                id="photo-input"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Supported formats: JPG, PNG, GIF (max 100MB per file, 150MB total, up to 70 files)
              </p>
            </div>

            {previews.length > 0 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Preview ({previews.length} file{previews.length !== 1 ? 's' : ''})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="space-y-2">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs text-gray-500 truncate" title={preview.file}>
                        {preview.file}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || selectedFiles.length === 0}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length || ''} Photo${selectedFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              Tips for Great Photos:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use good lighting and clear focus</li>
              <li>• Choose interesting subjects or compositions</li>
              <li>• Make sure your photo is appropriate for all audiences</li>
              <li>• Higher quality photos tend to get more votes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;