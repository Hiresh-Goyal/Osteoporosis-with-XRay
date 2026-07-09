import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Users, ActivitySquare, Trash2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_URL } from '../utils/api';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchAssignments();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}` }
      });
      const data = await res.json();
      if(data.status === 'success') {
        setUsers(data.users);
      }
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleRemove = async (userId, name) => {
    if(!window.confirm(`Are you sure you want to remove ${name}? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/remove-user/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}` }
      });
      if(res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        toast.success(`Removed user ${name}`);
      } else {
        toast.error("Failed to remove user");
      }
    } catch(err) {
      toast.error("Error removing user");
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/patient-assignments`);
      const data = await res.json();
      if(data.status === 'success') {
        setPatients(data.patients);
        setDoctors(data.doctors);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleAssign = async (patientId, doctorId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/assign-doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, doctor_id: doctorId })
      });
      if(res.ok) {
        toast.success('Doctor assigned successfully');
        fetchAssignments();
      } else {
        toast.error('Failed to assign doctor');
      }
    } catch (err) {
      toast.error('Failed to assign doctor');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <nav className="glass-panel rounded-none border-t-0 border-l-0 border-r-0 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => window.location.href = '/admin'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Activity className="text-teal-600" />
          <span className="font-bold text-lg tracking-wide text-slate-800">OsteoCare <span className="text-slate-500 font-normal">| Admin Hub</span></span>
        </button>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-800">System Admin</div>
            <div className="text-xs text-slate-600">IT & Operations</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-teal-500/30 flex items-center justify-center text-teal-600 font-bold">
            AD
          </div>
          <button onClick={() => { localStorage.clear(); window.location.replace('/login'); }} className="text-slate-600 hover:text-red-500 transition-colors ml-4 flex items-center gap-2">
            <LogOut size={20} />
            <span className="hidden sm:inline text-sm font-bold">Logout</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-6 w-full flex-1">


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="text-teal-600" size={20} /> Add Internal User
            </h3>
            <div className="text-slate-600 text-sm mb-4">Manually register new Doctors or Admins.</div>
            
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              try {
                const res = await fetch(`${BASE_URL}/auth/register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await res.json();
                
                if (data.status === 'success') {
                  e.target.reset();
                  fetchUsers();
                  toast.success('User created successfully!');
                } else {
                  toast.error(data.message || 'Failed to create user.');
                }
              } catch (err) {
                toast.error('Failed to create user. Network error.');
              }
            }}>
              <input type="text" name="name" placeholder="Full Name" required className="w-full input-glass py-2" />
              <input type="email" name="email" placeholder="Email Address" required className="w-full input-glass py-2" />
              <input type="password" name="password" placeholder="Password" required className="w-full input-glass py-2" />
              <select name="role" required className="w-full input-glass py-2 bg-white text-slate-800">
                <option value="Doctor">Doctor</option>
                <option value="Admin">Admin</option>
              </select>
              <button type="submit" className="w-full btn-primary py-2 text-sm mt-2">Create Account</button>
            </form>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="text-teal-600" size={20} /> User Management
            </h3>
            <div className="text-slate-600 text-sm mb-4">Manage and remove existing users from the platform.</div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {loading && <div className="text-center text-slate-500">Loading users...</div>}
              {users.map(u => (
                <div key={u.id} className="glass-card p-3 flex justify-between items-center group">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{u.name}</div>
                    <div className="text-xs text-slate-600">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'Doctor' ? 'bg-blue-500/20 text-blue-400' : 'bg-teal-500/20 text-teal-600'}`}>
                      {u.role}
                    </span>
                    <button onClick={() => handleRemove(u.id, u.name)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Patient Assignments Section */}
        <div className="mt-6 glass-panel p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ActivitySquare className="text-teal-600" size={20} /> Patient Assignments
          </h3>
          <div className="text-slate-600 text-sm mb-4">View and reassign doctors to patients.</div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.length === 0 && <div className="text-slate-500 italic col-span-full">No active patient assessments found.</div>}
            {patients.map(p => (
              <div key={p.patient_id} className="glass-card p-4">
                <div className="font-bold text-slate-800">{p.patient_name}</div>
                <div className="text-xs text-slate-500 mb-2">Assigned: {p.assigned_doctor_name}</div>
                
                <select 
                  className="input-glass w-full text-sm mt-2"
                  value={p.assigned_doctor_id || ''}
                  onChange={e => handleAssign(p.patient_id, e.target.value)}
                >
                  <option value="" disabled>Select Doctor</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
