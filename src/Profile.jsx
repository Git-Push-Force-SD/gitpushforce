import React, { useState, useRef } from 'react';
import { ArrowLeft, Edit2, Plus, Trash2, LogOut, Camera } from 'lucide-react';

const Profile = ({ onBack, onAddNew }) => {
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);

  const activeListings = [
    {
      id: 1,
      category: 'BOOKS',
      title: 'Advanced Macroeconomics',
      price: 'R450.00',
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 2,
      category: 'ELECTRONICS',
      title: 'Vintage Film Camera (Working)',
      price: 'R1200.00',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 3,
      category: 'FURNITURE',
      title: 'Minimalist Desk Lamp',
      price: 'R250.00',
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=200&q=80',
    },
  ];

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so the same file can be re-selected if needed
    event.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <section className="min-h-screen bg-offwhite font-main text-dark pb-20">
      {/* Header */}
      <section className="pt-8 px-8 max-w-3xl mx-auto flex items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-dark hover:text-gray-500 transition-colors font-medium text-lg"
        >
          <ArrowLeft size={20} />
          Profile
        </button>
      </section>

      {/* Main Content Box */}
      <section className="max-w-3xl mx-auto mt-12 px-6">
        {/* User Info Header */}
        <section className="flex flex-col md:flex-row items-center gap-8 mb-16">
          <section className="relative">
            {profileImage ? (
              <img
                src={profileImage}
                alt="User avatar"
                className="w-28 h-28 rounded-2xl object-cover shadow-sm bg-gray-100"
              />
            ) : (
              <section className="w-28 h-28 rounded-2xl bg-gray-200 flex items-center justify-center shadow-sm">
                <Camera size={32} className="text-gray-400" />
              </section>
            )}
            <button
              onClick={triggerFileInput}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-dark transition-colors border-2 border-white"
            >
              <Edit2 size={14} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </section>

          <section className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-dark tracking-tight mb-1">Alex Scholar</h1>
            <p className="text-gray-500 mb-4 text-sm font-medium">alex.scholar@students.wits.ac.za</p>
            <section className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded text-[0.65rem] font-bold tracking-wider uppercase">
                Class of 2025
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded text-[0.65rem] font-bold tracking-wider uppercase">
                Premium Curator
              </span>
            </section>
          </section>
        </section>

        {/* Listings Section */}
        <section>
          <section className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-dark">My Listings</h2>
            <span className="text-primary text-sm font-semibold">{activeListings.length} active</span>
          </section>

          <button
            onClick={onAddNew}
            className="w-full bg-dark hover:bg-primary text-white py-3.5 rounded-xl flex items-center justify-center gap-2 mb-6 font-semibold shadow-sm transition-colors"
          >
            <Plus size={18} />
            Add New Listing
          </button>

          <section className="space-y-4">
            {activeListings.map((listing) => (
              <section
                key={listing.id}
                className="bg-white p-4 rounded-xl flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-50 gap-5 relative group"
              >
                <section className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                  <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                </section>

                <section className="flex-1 pr-10">
                  <span className="text-primary font-bold text-[0.6rem] tracking-widest uppercase mb-1 block">
                    {listing.category}
                  </span>
                  <h3 className="font-semibold text-dark text-sm mb-1">{listing.title}</h3>
                  <p className="text-dark font-medium text-sm">{listing.price}</p>
                </section>

                <button className="absolute right-6 text-red-300 hover:text-red-600 transition-colors">
                  <Trash2 size={18} />
                </button>
              </section>
            ))}
          </section>
        </section>

        {/* Log Out */}
        <button className="w-full mt-12 bg-red-50 hover:bg-red-100 text-red-600 py-4 rounded-xl flex items-center justify-center gap-3 font-semibold transition-colors">
          <LogOut size={18} />
          Log Out
        </button>

        {/* Footer */}
        <section className="text-center mt-12 text-gray-400 text-xs tracking-wider uppercase font-semibold">
          <p className="mb-1">UNIMART V1.0.0</p>
          <p className="opacity-70">Marketplace for the Student Elite</p>
        </section>
      </section>
    </section>
  );
};

export default Profile;