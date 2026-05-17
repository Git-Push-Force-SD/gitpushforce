import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, Loader } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from './utils/supabase';

const SellItemModal = ({ onClose }) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: '',
    condition: '',
    description: '',
    listingType: 'sale',
  });
  
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  useEffect(() => {
    if (!formData.title || !formData.category) return;

    const timeout = setTimeout(async () => {
      setLoadingSuggestion(true);
      setPriceSuggestion(null);

      try {
        const { data, error } = await supabase.functions.invoke('suggest-price', {
          body: {
            title: formData.title,
            description: formData.description,
            category: formData.category.toUpperCase(),
          }
        });

        if (!error && data) setPriceSuggestion(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSuggestion(false);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [formData.title, formData.category]);

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    setUploadError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setUploadedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.price || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    if (!uploadedFile) {
      alert('Please upload an image');
      return;
    }

    try {
      setIsSubmitting(true);

      const fileName = `${user.id}/${Date.now()}_${uploadedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('Listings')
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
  .from('listings')
  .insert({
    seller_id: user.id,
    title: formData.title,
    description: formData.description,
    price: parseFloat(formData.price),
    category: formData.category,
    condition: formData.condition
      ? formData.condition.toLowerCase().replace(' ', '_')
      : null,
    image_path: fileName,
    status: 'active',
    listing_type: formData.listingType,
    cpi_suggested_price: priceSuggestion
      ? (priceSuggestion.min + priceSuggestion.max) / 2
      : null,
  });

      if (insertError) throw insertError;

      alert('Listing posted successfully!');
      onClose();
    } catch (error) {
      console.error('Error posting listing:', error);
      alert('Failed to post listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 backdrop-blur-sm overflow-y-auto">
      <section className="bg-white w-full max-w-xl rounded-2xl shadow-xl relative animate-in fade-in zoom-in duration-200 mt-auto sm:mt-0">

        {/* Header */}
        <section className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-dark">List New Item</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-dark transition-colors"
          >
            <X size={18} />
          </button>
        </section>

        {/* Form Body */}
        <section className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Image Upload */}
            <section>
              <label className="block text-sm font-semibold text-dark mb-2">Item Photos</label>
              <button
                type="button"
                onClick={triggerFileInput}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer"
              >
                {uploadedFile ? (
                  <>
                    <span className="text-sm font-medium text-green-600">✓ Image selected</span>
                    <span className="text-xs text-green-500 mt-1">{uploadedFile.name}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={28} className="mb-2" />
                    <span className="text-sm font-medium">Click to upload images</span>
                    <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
              />
              {uploadError && <p className="text-red-600 text-xs mt-2">{uploadError}</p>}
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Title */}
              <section className="sm:col-span-2">
                <label className="block text-sm font-semibold text-dark mb-2">Item Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Minimalist Desk Lamp"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  required
                />
              </section>

              {/* Category */}
              <section>
                <label className="block text-sm font-semibold text-dark mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-white cursor-pointer"
                  required
                >
                  <option value="">Select category...</option>
                  <option value="textbooks">Textbooks</option>
                  <option value="electronics">Electronics</option>
                  <option value="furniture">Furniture</option>
                  <option value="clothing">Clothing</option>
                  <option value="other">Other</option>
                </select>
              </section>

              {/* Listing Type */}
              <section>
                <label className="block text-sm font-semibold text-dark mb-2">Listing Type</label>
                <select
                  name="listingType"
                  value={formData.listingType}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-white cursor-pointer"
                  required
                >
                  <option value="sale">For Sale</option>
                  <option value="trade">For Trade</option>
                  <option value="either">Either</option>
                </select>
              </section>

              {/* Condition - optional */}
              <section className="sm:col-span-2">
                <label className="block text-sm font-semibold text-dark mb-2">
                  Condition{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <section className="flex gap-4 flex-wrap">
                  {['New', 'Like New', 'Good'].map((cond) => (
                    <label key={cond} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="condition"
                        value={cond}
                        checked={formData.condition === cond}
                        onChange={handleFormChange}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{cond}</span>
                    </label>
                  ))}
                  {formData.condition && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, condition: '' }))}
                      className="text-xs text-gray-400 underline"
                    >
                      Clear
                    </button>
                  )}
                </section>
              </section>

              {/* Description */}
              <section className="sm:col-span-2">
                <label className="block text-sm font-semibold text-dark mb-2">Description</label>
                <textarea
                  rows="3"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Describe your item, mention any flaws..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                ></textarea>
              </section>

              {/* Price - last */}
              <section className="sm:col-span-2">
                <label className="block text-sm font-semibold text-dark mb-2">Price (R)</label>

                {loadingSuggestion && (
                  <p className="text-xs text-gray-400 animate-pulse mb-2">
                    Fetching price suggestion...
                  </p>
                )}

                {priceSuggestion && !loadingSuggestion && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-2">
                    <p className="text-sm font-semibold text-blue-700">
                      Suggested: R{priceSuggestion.min?.toLocaleString()} –{' '}
                      R{priceSuggestion.max?.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">{priceSuggestion.reason}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          price: String(priceSuggestion.min),
                        }))
                      }
                      className="text-xs text-blue-600 underline mt-1"
                    >
                      Use suggested price
                    </button>
                  </div>
                )}

                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  min="0"
                  max={priceSuggestion ? priceSuggestion.max : undefined}
                  step="0.01"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  required
                />
                {priceSuggestion && Number(formData.price) > priceSuggestion.max && (
                  <p className="text-xs text-red-500 mt-1">
                    Price exceeds suggested maximum of R{priceSuggestion.max?.toLocaleString()}
                  </p>
                )}
              </section>

            </section>
          </form>
        </section>

        {/* Footer */}
        <section className="p-6 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-semibold text-gray-600 hover:bg-gray-200 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg font-semibold bg-dark text-white hover:bg-primary transition-colors text-sm shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader size={16} className="animate-spin" />
                Posting...
              </>
            ) : (
              'Post Listing'
            )}
          </button>
        </section>

      </section>
    </section>
  );
};

export default SellItemModal;