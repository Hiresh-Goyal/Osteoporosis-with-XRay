import React, { useState, useEffect } from 'react';
import { Users, Activity, FileText, CheckCircle2, X, BrainCircuit, BarChart3, ShieldCheck, AlertTriangle, Loader2, ScanFace, Database, Calendar, LogOut, TrendingUp, Heart, Bone, Clock, Filter, ChevronDown, ChevronUp, UploadCloud, Image } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { BASE_URL } from '../utils/api';
import toast from 'react-hot-toast';

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [prescription, setPrescription] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [stats, setStats] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [ageGroupFilter, setAgeGroupFilter] = useState('All');
  const [showDashboard, setShowDashboard] = useState(true);
  const [xrayFile, setXrayFile] = useState(null);
  
  const DEXA_LABELS = {
    fnt: "Femoral Neck T-Score (DEXA Scan)",
    calcitriol: "Active Vitamin D (1,25-Dihydroxy Vitamin D) (pg/mL)",
    uric: "Uric Acid (mg/dL)",
    alt: "Alanine Aminotransferase (ALT) (U/L)",
    bun: "Blood Urea Nitrogen (BUN) (mg/dL)",
    crea: "Serum Creatinine (mg/dL)",
    fbg: "Fasting Blood Glucose (FBG) (mg/dL)",
    ldl_c: "LDL Cholesterol (mg/dL)",
    l1_4t: "Lumbar Spine (L1–L4) T-Score (DEXA Scan)",
    age: "Age (Years)",
    hdl_c: "HDL Cholesterol (mg/dL)",
    bmi: "Body Mass Index (BMI) (kg/m²)",
    ca: "Serum Calcium (mg/dL)",
    p: "Serum Phosphorus (mg/dL)",
    height: "Height (cm)",
    ast: "Aspartate Aminotransferase (AST) (U/L)",
    weight: "Weight (kg)",
    calsium: "Calcium Supplement Intake",
    calcitonin: "Calcitonin Hormone (pg/mL)",
    as_: "Ankylosing Spondylitis"
  };
  
  const [form, setForm] = useState({
    fnt: -1.5, calcitriol: 30.5, uric: 5.2, alt: 25.0, bun: 15.0,
    crea: 0.9, fbg: 90.0, ldl_c: 110.0, l1_4t: -1.2, age: 65,
    hdl_c: 50.0, bmi: 24.5, ca: 9.2, p: 3.5, height: 165.0,
    ast: 22.0, weight: 68.0, calsium: 1, calcitonin: 12.0, as_: 0
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/doctor/patients`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}` }
      });
      const data = await res.json();
      if(data.status === 'success') {
        setPatients(data.patients.filter(p => p.questionnaire_filled));
      }
    } catch(err) {
      console.error(err);
    }
   };

  const fetchStats = async (from, to, gender, ageGroup) => {
    try {
      let url = `${BASE_URL}/api/v1/doctor/stats`;
      const params = new URLSearchParams();
      if (from) params.append('date_from', from);
      if (to) params.append('date_to', to);
      if (gender && gender !== 'All') params.append('gender', gender);
      if (ageGroup && ageGroup !== 'All') params.append('age_group', ageGroup);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  useEffect(() => {
    fetchStats(dateFrom, dateTo, genderFilter, ageGroupFilter);
  }, [dateFrom, dateTo, genderFilter, ageGroupFilter]);

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    if (p.age) {
      setForm(prev => ({ ...prev, age: p.age }));
    }
  };

  const set = (field, val) => {
    setForm(f => {
      const updated = { ...f, [field]: val };
      // Auto-calculate BMI when height or weight changes
      if (field === 'height' || field === 'weight') {
        const h = field === 'height' ? parseFloat(val) : parseFloat(updated.height);
        const w = field === 'weight' ? parseFloat(val) : parseFloat(updated.weight);
        if (h > 0 && w > 0) {
          const heightInMeters = h / 100;
          updated.bmi = parseFloat((w / (heightInMeters * heightInMeters)).toFixed(2));
        }
      }
      return updated;
    });
  };

  const handleRequest = async (req) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/doctor/request_action`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          action: req,
          medication: prescription
        })
      });
      if(res.ok) {
        setPatients(pts => pts.map(p => p.id === selectedPatient.id ? { ...p, request: req } : p));
        setSelectedPatient({ ...selectedPatient, request: req });
        setPrescription('');
      }
    } catch(err) {
      toast.error("Error saving action");
    }
  };

  const handlePredictDexa = async () => {
    setIsProcessing(true);
    setProcessingText('Ingesting tabular features...');
    await new Promise(r => setTimeout(r, 1000));
    setProcessingText('Executing Ensemble ML Model Pipeline...');
    await new Promise(r => setTimeout(r, 1200));
    setProcessingText('Generating probability distributions...');
    await new Promise(r => setTimeout(r, 800));

    try {
      const res = await fetch(`${BASE_URL}/api/v1/predict/ml-dexa`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...form, patient_id: selectedPatient.id })
      });
      const data = await res.json();
      setIsProcessing(false);
      
      if(data.status === 'success') {
        setPredictionResult({
           type: 'DEXA Tabular ML',
           prediction: data.prediction,
           confidence: data.confidence,
           probabilities: data.probabilities,
           pdf_url: data.pdf_url
        });
        setActionModal(null);
        setSelectedPatient(null);
        fetchPatients();
      } else {
        toast.error(`Error: ${data.message}`);
      }
    } catch (err) {
      setIsProcessing(false);
      toast.error(`Prediction failed: ${err.message}`);
    }
  };

  const handlePredictXray = async () => {
    if(!xrayFile) {
      toast.error("Please select an X-Ray image first.");
      return;
    }
    setIsProcessing(true);
    setProcessingText('Analyzing X-Ray using DenseNet121 DL Model...');
    setActionModal(null);
    
    try {
      const formData = new FormData();
      formData.append('image', xrayFile);
      formData.append('patient_id', selectedPatient.id);
      
      const res = await fetch(`${BASE_URL}/api/v1/doctor/analyze-xray`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}` },
        body: formData
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch(parseErr) {
        toast.error(`Server error (${res.status}): ${text.substring(0, 150) || 'Empty response'}`);
        setIsProcessing(false);
        setXrayFile(null);
        return;
      }
      
      if(res.ok) {
        setPredictionResult({
           type: 'X-Ray & ML Fusion',
           prediction: data.prediction,
           confidence: data.confidence,
           dl_prediction: data.dl_prediction,
           pdf_url: data.pdf_url
        });
        fetchPatients();
        setSelectedPatient(prev => ({ ...prev, request: null, final_prediction: data.prediction }));
        setStats(null);
        fetchStats();
      } else {
        toast.error(data.message || 'Error analyzing X-Ray');
      }
    } catch(err) {
      toast.error(`Connection failed: ${err.message}`);
    }
    setIsProcessing(false);
    setXrayFile(null);
  };

  const handleAssignAppointment = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/doctor/assign-appointment`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ patient_id: selectedPatient.id, appointment_time: appointmentTime })
      });
      if(res.ok) {
        setAppointmentTime('');
        fetchPatients();
        setSelectedPatient(prev => ({ ...prev, appointment_time: appointmentTime }));
      }
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <nav className="glass-panel rounded-none border-t-0 border-l-0 border-r-0 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => window.location.href = '/doctor'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Activity className="text-teal-600" />
          <span className="font-bold text-lg text-slate-800">OsteoCare Doctor Portal</span>
        </button>
        <button onClick={() => { localStorage.clear(); window.location.replace('/login'); }} className="text-slate-600 hover:text-red-500 transition-colors ml-4 flex items-center gap-2">
          <LogOut size={20} />
          <span className="hidden sm:inline text-sm font-bold">Logout</span>
        </button>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-3 gap-6 mt-6 w-full flex-1">
        
        {/* Patient List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Assigned Patients</h2>
          {patients.length === 0 && <div className="text-slate-500 italic">No patients assigned yet.</div>}
          {patients.map(p => (
            <div 
              key={p.id} 
              onClick={() => handleSelectPatient(p)}
              className={`glass-card p-4 cursor-pointer transition-all ${selectedPatient?.id === p.id ? 'border-teal-400 bg-teal-900/20' : 'hover:border-slate-500'}`}
            >
              <div className="font-bold text-slate-800">{p.name}</div>
              <div className={`text-sm font-semibold mt-1 ${p.initialRisk === 'High Risk' ? 'text-red-400' : 'text-teal-600'}`}>
                Initial Scan: {p.initialRisk}
              </div>
              {p.request && <div className="text-xs text-amber-600 mt-2">Requested: {p.request}</div>}
              {p.appointment_requested && !p.appointment_time && <div className="text-xs text-indigo-600 mt-1 font-bold">Appointment Requested</div>}
            </div>
          ))}
        </div>

        {/* Patient Detail / Actions */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <div className="glass-panel p-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedPatient.name}</h2>
              <div className="flex gap-4 mb-6">
                <div className={`inline-block px-4 py-2 rounded-xl text-sm font-bold border ${selectedPatient.initialRisk === 'High Risk' ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-teal-500/50 bg-teal-500/10 text-teal-600'}`}>
                  <div className="text-xs font-normal text-slate-600 mb-1">AI Prediction (Without DEXA)</div>
                  {selectedPatient.initialRisk}
                </div>
                {selectedPatient.final_prediction && (
                  <div className={`inline-block px-4 py-2 rounded-xl text-sm font-bold border ${selectedPatient.final_prediction === 'Osteoporosis' || selectedPatient.final_prediction === 'Osteopenia' ? 'border-amber-500/50 bg-amber-500/10 text-amber-600' : 'border-blue-500/50 bg-blue-500/10 text-blue-400'}`}>
                    <div className="text-xs font-normal text-slate-600 mb-1">Updated AI Prediction</div>
                    {selectedPatient.final_prediction}
                  </div>
                )}
                {selectedPatient.pdf_url && (
                  <a href={`${BASE_URL}${selectedPatient.pdf_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold border border-indigo-500/50 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors">
                    <FileText size={16} className="mr-2" /> View Detailed Report
                  </a>
                )}
              </div>

              {!selectedPatient.appointment_time ? (
                <div className="bg-slate-100 border border-slate-200 p-6 rounded-xl text-center mb-6">
                  <Calendar className="mx-auto text-slate-400 mb-2" size={32} />
                  <h3 className="text-lg font-bold text-slate-700 mb-2">Appointment Required</h3>
                  <p className="text-slate-500 text-sm">Please schedule an appointment with the patient below before prescribing medication or requesting scans.</p>
                </div>
              ) : !selectedPatient.request ? (
                <div>
                  <h3 className="text-lg font-medium text-slate-700 mb-4">Doctor Actions</h3>
                  
                  <div className="mb-6">
                    <label className="text-sm text-slate-600 block mb-1">Prescribe Medication / Notes</label>
                    <textarea 
                      value={prescription}
                      onChange={e => setPrescription(e.target.value)}
                      placeholder="e.g. Prescribed Vitamin D 600mg daily..."
                      className="input-glass w-full h-24 p-3"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                    <button onClick={() => handleRequest('DEXA')} className="btn-primary flex-col py-4 gap-2 flex-1 w-full">
                      <FileText /> Request DEXA Scan
                    </button>
                    <span className="text-xs font-bold text-slate-400 shrink-0">OR</span>
                    <button onClick={() => handleRequest('X-Ray')} className="btn-primary flex-col py-4 gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20 border-indigo-500 flex-1 w-full">
                      <Image /> Request X-Ray Scan
                    </button>
                  </div>
                  <button onClick={() => handleRequest('Reviewed')} className="w-full glass-card flex-col py-4 gap-2 text-slate-700 hover:text-slate-800 hover:border-white">
                    <CheckCircle2 /> Mark as Reviewed
                  </button>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-amber-600 mb-2">Pending {selectedPatient.request} Results</h3>
                  <p className="text-slate-700 mb-4">The patient has been notified. Upload the results once available.</p>
                  {selectedPatient.request !== 'Reviewed' && (
                    <button onClick={() => setActionModal(selectedPatient.request.toLowerCase())} className="btn-primary">
                      Upload {selectedPatient.request} Results
                    </button>
                  )}
                </div>
              )}
              
              {/* Appointment Assignment Section */}
              {selectedPatient.appointment_requested && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2 mb-4">
                    <Calendar className="text-indigo-600" size={20} /> Appointment Scheduling
                  </h3>
                  {!selectedPatient.appointment_time ? (
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-sm text-slate-600 block mb-1">Select Date & Time</label>
                        <input 
                          type="datetime-local" 
                          value={appointmentTime}
                          onChange={e => setAppointmentTime(e.target.value)}
                          className="input-glass w-full"
                        />
                      </div>
                      <button onClick={handleAssignAppointment} disabled={!appointmentTime} className="btn-primary bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                        Assign Time
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex justify-between items-center">
                      <span><strong>Scheduled for:</strong> {new Date(selectedPatient.appointment_time).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
              
              {/* Left Sidebar - Filters */}
              <div className="w-full lg:w-1/4 shrink-0 flex flex-col gap-4">
                <div className="glass-panel p-5 sticky top-24">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Filter size={16} className="text-teal-600" /> Filters
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">From Date</label>
                      <input 
                        type="date" 
                        value={dateFrom} 
                        onChange={e => setDateFrom(e.target.value)}
                        className="input-glass text-sm w-full py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">To Date</label>
                      <input 
                        type="date" 
                        value={dateTo} 
                        onChange={e => setDateTo(e.target.value)}
                        className="input-glass text-sm w-full py-1.5"
                      />
                    </div>
                    
                    <div className="pt-2 border-t border-slate-100">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Gender</label>
                      <select 
                        value={genderFilter} 
                        onChange={e => setGenderFilter(e.target.value)}
                        className="input-glass text-sm w-full py-2 cursor-pointer"
                      >
                        <option value="All">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Age Group</label>
                      <select 
                        value={ageGroupFilter} 
                        onChange={e => setAgeGroupFilter(e.target.value)}
                        className="input-glass text-sm w-full py-2 cursor-pointer"
                      >
                        <option value="All">All Ages</option>
                        <option value="Teenager (0-17)">Teenager (0-17)</option>
                        <option value="Young Adult (18-25)">Young Adult (18-25)</option>
                        <option value="Adult (26-64)">Adult (26-64)</option>
                        <option value="Senior Citizen (65+)">Senior Citizen (65+)</option>
                      </select>
                    </div>
                    
                    {(dateFrom || dateTo || genderFilter !== 'All' || ageGroupFilter !== 'All') && (
                      <button 
                        onClick={() => { setDateFrom(''); setDateTo(''); setGenderFilter('All'); setAgeGroupFilter('All'); }}
                        className="w-full mt-4 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition-colors border border-red-100"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Content - KPIs and Charts */}
              <div className="w-full lg:w-3/4 flex flex-col gap-6">
                
                {/* Stats Header Area */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
                    <TrendingUp className="text-teal-600" size={24} />
                    Analytics Dashboard
                  </div>
                </div>

                {!stats ? (
                  <div className="text-center text-slate-400 py-12 glass-panel">
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Loading analytics...
                  </div>
                ) : (
                  <>
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-5 border border-teal-200 shadow-sm transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-teal-700 mb-2">
                          <Users size={18} />
                          <span className="text-sm font-bold uppercase tracking-wide">Total Patients</span>
                        </div>
                        <div className="text-4xl font-black text-teal-800">{stats.total_patients}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl p-5 border border-rose-200 shadow-sm transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-rose-700 mb-2">
                          <Bone size={18} />
                          <span className="text-sm font-bold uppercase tracking-wide">Osteoporosis</span>
                        </div>
                        <div className="text-4xl font-black text-rose-800">{stats.osteoporosis}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 border border-amber-200 shadow-sm transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-2 text-amber-700 mb-2">
                          <AlertTriangle size={18} />
                          <span className="text-sm font-bold uppercase tracking-wide">High Risk (Initial)</span>
                        </div>
                        <div className="text-4xl font-black text-amber-800">{stats.high_risk_initial}</div>
                      </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                      
                      {/* Status Breakdown (Pending vs Reviewed) */}
                      <div className="glass-panel p-5 rounded-2xl flex flex-col h-72">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                          <Clock size={16} className="text-indigo-500"/> Workflow Status (Pending vs Reviewed)
                        </h4>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Pending Review', value: stats.pending_review, color: '#f59e0b' },
                                  { name: 'Reviewed', value: stats.reviewed, color: '#10b981' }
                                ]}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                              >
                                {[{ name: 'Pending Review', value: stats.pending_review, color: '#f59e0b' },
                                  { name: 'Reviewed', value: stats.reviewed, color: '#10b981' }].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Action Bar Chart */}
                      <div className="glass-panel p-5 rounded-2xl flex flex-col h-72">
                        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                          <BarChart3 size={16} className="text-blue-500"/> Patient Throughput
                        </h4>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                { name: 'Pending', count: stats.pending_review, fill: '#818cf8' },
                                { name: 'Reviewed', count: stats.reviewed, fill: '#60a5fa' },
                                { name: 'Osteoporosis', count: stats.osteoporosis, fill: '#fb7185' }
                              ]}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {actionModal === 'dexa' && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="glass-panel max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Input DEXA Scan Values</h2>
              <button onClick={() => setActionModal(null)} className="text-slate-600 hover:text-slate-800"><X /></button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Enter the 20 standardized features for the ML model.</p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {Object.keys(form).map(key => (
                <div key={key}>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 truncate" title={DEXA_LABELS[key] || key}>
                    {DEXA_LABELS[key] || key}
                    {key === 'bmi' && <span className="text-emerald-600 ml-1">(auto)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form[key]}
                    onChange={e => set(key, parseFloat(e.target.value))}
                    readOnly={key === 'bmi'}
                    min={['age', 'height', 'weight'].includes(key) ? 0 : undefined}
                    max={key === 'age' ? 120 : undefined}
                    className={`input-glass w-full ${key === 'bmi' ? 'bg-emerald-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              ))}
            </div>
            
            <button onClick={handlePredictDexa} className="btn-primary w-full">Generate AI Prediction & Report</button>
          </div>
        </div>
      )}
      {/* X-Ray Modal */}
      {actionModal === 'x-ray' && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">X-Ray Scan Analysis</h2>
              <button onClick={() => setActionModal(null)} className="text-slate-600 hover:text-slate-800"><X /></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side: Upload */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">X-Ray Image</h3>
                <label className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer h-64">
                  <div className="bg-slate-200 p-4 rounded-full mb-4 text-teal-600">
                    <UploadCloud size={32} />
                  </div>
                  {xrayFile ? (
                    <p className="font-bold text-teal-700 mb-1">{xrayFile.name}</p>
                  ) : (
                    <>
                      <p className="font-bold text-slate-700 mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-500 mb-4">PNG, JPG or DICOM (max. 10MB)</p>
                      <div className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 shadow-sm">Select File</div>
                    </>
                  )}
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => setXrayFile(e.target.files[0])} />
                </label>
              </div>

              {/* Right Side: Form */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Optional Clinical Data</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Patient Name</label>
                    <input 
                      type="text" 
                      value={selectedPatient?.name || ''} 
                      readOnly
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Report Output Format</label>
                    <select className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 cursor-pointer">
                      <option>PDF Report</option>
                      <option>Raw Data JSON</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
              <button onClick={() => { setActionModal(null); setXrayFile(null); }} className="px-6 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors border border-slate-200 bg-white">Cancel</button>
              <button onClick={handlePredictXray} className="px-6 py-2 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-lg shadow-teal-900/20">
                Analyze Scan
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Premium Prediction Result Modal */}
      {predictionResult && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative max-w-lg w-full p-8 rounded-2xl border-2 ${
              predictionResult.prediction === 'Healthy' || predictionResult.prediction === 'Normal' || predictionResult.prediction === 'Low Risk'
                ? 'border-emerald-500 bg-white' 
                : predictionResult.prediction === 'Osteopenia' 
                  ? 'border-amber-500 bg-white'
                  : 'border-rose-500 bg-white'
            } shadow-2xl shadow-black`}>
            
            <div className="absolute top-4 right-4">
              <button onClick={() => setPredictionResult(null)} className="text-slate-600 hover:text-slate-800 transition-colors"><X /></button>
            </div>

            <div className="text-center mb-8 mt-2">
              <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${
                  predictionResult.prediction === 'Healthy' || predictionResult.prediction === 'Normal' || predictionResult.prediction === 'Low Risk'
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20' 
                    : predictionResult.prediction === 'Osteopenia' 
                      ? 'bg-amber-500/20 text-amber-600 shadow-amber-500/20'
                      : 'bg-rose-500/20 text-rose-400 shadow-rose-500/20'
                }`}>
                {predictionResult.prediction === 'Healthy' || predictionResult.prediction === 'Normal' || predictionResult.prediction === 'Low Risk' ? <ShieldCheck size={48} /> : <AlertTriangle size={48} />}
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Analysis Complete</h2>
              <p className="text-slate-600 font-mono text-sm flex items-center justify-center gap-2">
                <BrainCircuit size={16} className="text-teal-600"/>
                {predictionResult.type} inference finished
              </p>
            </div>


            <div className="space-y-4 mb-8">
              <div className="bg-white/80 rounded-xl p-5 border border-slate-200 flex justify-between items-center shadow-inner">
                <span className="text-slate-600 font-medium flex items-center gap-2">
                  <BarChart3 size={18}/> Predicted Class
                </span>
                <span className={`text-2xl font-black tracking-wide ${
                  predictionResult.prediction === 'Healthy' || predictionResult.prediction === 'Normal' || predictionResult.prediction === 'Low Risk' ? 'text-emerald-400' : predictionResult.prediction === 'Osteopenia' ? 'text-amber-600' : 'text-rose-400'
                }`}>{predictionResult.prediction.toUpperCase()}</span>
              </div>
              
              <div className="bg-white/80 rounded-xl p-5 border border-slate-200 shadow-inner">
                <div className="mb-4">
                {predictionResult.confidence && (
                  <div className="mb-4">
                    <span className="text-slate-600 font-medium text-sm flex items-center gap-2 mb-3"><Activity size={14}/> Risk Confidence Score</span>
                    <div className="bg-white rounded-lg p-3 border border-slate-200 text-center text-lg font-bold text-slate-800">
                      {predictionResult.confidence}%
                    </div>
                  </div>
                )}
                
                {predictionResult.dl_prediction && (
                  <div className="mb-4">
                    <span className="text-slate-600 font-medium text-sm flex items-center gap-2 mb-3"><Image size={14}/> X-Ray DL Specific Prediction</span>
                    <div className="bg-white rounded-lg p-3 border border-slate-200 text-center text-lg font-bold text-slate-800">
                      {predictionResult.dl_prediction}
                    </div>
                  </div>
                )}
                
                {predictionResult.probabilities && Object.entries(predictionResult.probabilities).map(([key, val]) => (
                    <div key={key} className="mb-3 last:mb-0">
                      <div className="flex justify-between text-xs mb-1 font-mono">
                        <span className={key === 'Normal' || key === 'Healthy' ? 'text-emerald-400' : key === 'Osteopenia' ? 'text-amber-600' : 'text-rose-400'}>{key}</span>
                        <span className="text-slate-800">{val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            key === 'Normal' || key === 'Healthy' ? 'bg-emerald-500' : key === 'Osteopenia' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} 
                          style={{ width: `${val}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setPredictionResult(null)} className="flex-1 py-3 px-4 rounded-xl font-bold bg-white text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200">
                Dismiss
              </button>
              {predictionResult.pdf_url && (
                <button onClick={() => window.open(`${BASE_URL}${predictionResult.pdf_url}`, '_blank')} className="flex-1 py-3 px-4 rounded-xl font-bold bg-blue-600 text-slate-800 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 flex justify-center items-center gap-2 border border-blue-400/30">
                  <FileText size={20} /> Download Full Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Processing Modal */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[60] backdrop-blur-md">
          <div className="flex flex-col items-center justify-center text-center">
            <ScanFace className="w-24 h-24 text-teal-600 animate-pulse mb-6" />
            <div className="flex items-center gap-3 text-2xl font-bold text-slate-800 mb-2">
              <Loader2 className="animate-spin text-teal-500" />
              AI Analysis in Progress
            </div>
            <p className="text-teal-600 font-mono text-sm animate-pulse">{processingText}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
