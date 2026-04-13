import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
import { AlertCircle, CheckCircle, Loader, Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function AdminPanel({ user, userRole, onBack }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const canAccessAdmin = userRole === 'admin';
  if (!canAccessAdmin) {
    return null;
  }

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('trade_facility_staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load staff: ' + error.message });
    }
  };

  const createStaffAccount = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!newStaffEmail || !newStaffName) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    try {
      // Create staff account in database
      const { data, error } = await supabase
        .from('trade_facility_staff')
        .insert([
          {
            created_by: user.id,
            email: newStaffEmail,
            name: newStaffName,
            role: 'staff'
          }
        ]);

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: 'Staff account created successfully. Email an account creation link separately.' 
      });
      setNewStaffEmail('');
      setNewStaffName('');
      await loadStaff();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const { error } = await supabase
        .from('trade_facility_staff')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Staff member removed' });
      await loadStaff();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="admin-panel bg-offwhite min-h-screen">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="text-dark hover:text-primary transition-colors p-2 hover:bg-gray-100 rounded-lg"
                title="Back to Dashboard"
              >
                <ArrowLeft size={24} className="stroke-[1.5]" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-dark">Admin Panel</h1>
          </div>
          <div className="text-sm text-gray-600">
            Trade Facilitator Management
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-offwhite rounded-lg p-6 max-w-4xl mx-auto my-8">

      {/* Message Display */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
          message.type === 'error' ? 'bg-red-100 text-red-800' : 
          'bg-green-100 text-green-800'
        }`}>
          {message.type === 'error' ? (
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Create New Staff Section */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-dark mb-4 flex items-center gap-2">
          <Plus size={20} /> Create Staff Account
        </h3>

        <form onSubmit={createStaffAccount} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Staff member name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                placeholder="staff@students.wits.ac.za"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-dark text-white py-2 rounded-lg font-semibold hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading && <Loader size={18} className="animate-spin" />}
            Create Account
          </button>
        </form>
      </div>

      {/* Staff List */}
      <div>
        <h3 className="text-lg font-semibold text-dark mb-4">Trade Facility Staff</h3>

        {staff.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No staff members yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dark">Created</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-dark">Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-dark">{member.name}</td>
                    <td className="px-4 py-3 text-sm text-dark">{member.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteStaff(member.id)}
                        className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                        title="Delete staff member"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
