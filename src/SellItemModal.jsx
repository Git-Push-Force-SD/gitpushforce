import React from 'react';
import { X, UploadCloud } from 'lucide-react';

const SellItemModal = ({ onClose }) => {
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
          <form className="space-y-5">
            
            {/* Image Upload Area */}
            <section>
              <label className="block text-sm font-semibold text-dark mb-2">Item Photos</label>
              <section className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer">
                <UploadCloud size={28} className="mb-2" />
                <span className="text-sm font-medium">Click to upload images</span>
                <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
              </section>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Title */}
              <section className="sm:col-span-2">
                <label className="block text-sm font-semibold text-dark mb-2">Item Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Minimalist Desk Lamp" 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </section>

              {/* Price */}
              <section>
                <label className="block text-sm font-semibold text-dark mb-2">Price (R)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </section>

              {/* Category */}
              <section>
                <label className="block text-sm font-semibold text-dark mb-2">Category</label>
                <select className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-white cursor-pointer">
                  <option value="">Select category...</option>
                  <option value="textbooks">Textbooks</option>
                  <option value="electronics">Electronics</option>
                  <option value="furniture">Furniture</option>
                  <option value="clothing">Clothing</option>
                </select>
              </section>

              {/* Condition */}
              <section className="sm:col-span-2">
                <label className="block text-sm font-semibold text-dark mb-2">Condition</label>
                <section className="flex gap-4">
                  {['New', 'Like New', 'Good'].map((cond) => (
                    <label key={cond} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="condition" value={cond} className="text-primary focus:ring-primary" />
                      <span className="text-sm text-gray-700">{cond}</span>
                    </label>
                  ))}
                </section>
              </section>

              {/* Description */}
              <section className="sm:col-span-2">
                <label className="block text-sm font-semibold text-dark mb-2">Description</label>
                <textarea 
                  rows="3" 
                  placeholder="Describe your item, mention any flaws..." 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                ></textarea>
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
            className="px-6 py-2.5 rounded-lg font-semibold bg-dark text-white hover:bg-primary transition-colors text-sm shadow-sm"
          >
            Post Listing
          </button>
        </section>

      </section>
    </section>
  );
};

export default SellItemModal;
