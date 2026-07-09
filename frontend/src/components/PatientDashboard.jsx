import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, FileText, Pill, Calendar, LogOut, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_URL } from '../utils/api';

const PatientDashboard = () => {
  const user = JSON.parse(localStorage.getItem('osteocare_user')) || { name: 'Patient' };
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [isRetaking, setIsRetaking] = useState(false);

  const [form, setForm] = useState({
    Age: '', Gender: '', Hormonal_Changes: 'Normal', Family_History: 'No', Race_Ethnicity: 'Caucasian',
    Body_Weight: 'Normal', Calcium_Intake: 'Adequate', Vitamin_D_Intake: 'Sufficient',
    Physical_Activity: 'Active', Smoking: 'No', Alcohol_Consumption: 'None',
    Medical_Conditions: 'None', Medications: 'None', Prior_Fractures: 'No'
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/patient/profile`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}` }
      });
      const data = await res.json();
      if(data.status === 'success') {
        setProfile(data.profile);
      }
    } catch(err) {
      setError('Failed to load profile');
    }
    setLoading(false);
  };

  const handleRequestAppointment = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/patient/request-appointment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}` }
      });
      if(res.ok) {
        fetchProfile();
      }
    } catch(err) {
      console.error(err);
    }
  };

  const setF = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmitQuestionnaire = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const submissionData = { ...form };
    if (submissionData.Gender === 'Male') {
      submissionData.Hormonal_Changes = 'Normal';
    }

    try {
      const res = await fetch(`${BASE_URL}/api/v1/patient/submit-questionnaire`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('osteocare_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });
      const data = await res.json();
      if(data.status === 'success') {
        setIsRetaking(false);
        toast.success('Assessment submitted successfully!');
        await fetchProfile();
      } else {
        toast.error(data.message);
      }
    } catch(err) {
      toast.error('Submission failed');
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <Activity className="text-teal-500 w-12 h-12 animate-bounce" />
        <p className="text-slate-500 font-medium">Loading your portal...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <nav className="glass-panel rounded-none border-t-0 border-l-0 border-r-0 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <button onClick={() => window.location.href = '/patient'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Activity className="text-teal-600" />
          <span className="font-bold text-lg tracking-wide text-slate-800">OsteoCare</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-600">Patient Portal</div>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.replace('/login'); }} className="text-slate-600 hover:text-red-500 transition-colors ml-4 flex items-center gap-2">
            <LogOut size={20} />
            <span className="hidden sm:inline text-sm font-bold">Logout</span>
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto w-full p-6 mt-6 flex-1 flex flex-col gap-6">
        
        {(!profile?.questionnaire_filled || isRetaking) ? (
          <div className="glass-panel p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Health Assessment</h2>
            <p className="text-slate-600 mb-6">Please complete this questionnaire. Your assigned doctor will review your responses.</p>
            
            <form onSubmit={handleSubmitQuestionnaire} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 rounded-[2rem] bg-gradient-to-br from-white/90 via-teal-50/50 to-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-teal-100/60 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl -z-10"></div>
                
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Age</label>
                  <input required type="number" min="0" max="120" value={form.Age} onChange={e => setF('Age', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] placeholder:text-slate-400" placeholder="e.g. 65" />
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Gender</label>
                  <select required value={form.Gender} onChange={e => setF('Gender', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option value="" disabled>Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Race/Ethnicity</label>
                  <select required value={form.Race_Ethnicity} onChange={e => setF('Race_Ethnicity', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option value="" disabled>Select Ethnicity</option>
                    <option value="African American">African American</option>
                    <option value="Asian">Asian</option>
                    <option value="Caucasian">Caucasian</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Body Weight</label>
                  <select value={form.Body_Weight} onChange={e => setF('Body_Weight', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>Underweight</option>
                    <option>Normal</option>
                    <option>Overweight</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Calcium Intake</label>
                  <select value={form.Calcium_Intake} onChange={e => setF('Calcium_Intake', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>Low</option>
                    <option>Adequate</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Vitamin D Intake</label>
                  <select value={form.Vitamin_D_Intake} onChange={e => setF('Vitamin_D_Intake', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>Insufficient</option>
                    <option>Sufficient</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Physical Activity</label>
                  <select value={form.Physical_Activity} onChange={e => setF('Physical_Activity', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>Sedentary</option>
                    <option>Active</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Smoking</label>
                  <select value={form.Smoking} onChange={e => setF('Smoking', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Alcohol Consumption</label>
                  <select value={form.Alcohol_Consumption} onChange={e => setF('Alcohol_Consumption', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>None</option>
                    <option>Moderate</option>
                    <option>High</option>
                  </select>
                </div>
                {form.Gender !== 'Male' && (
                  <div className="group space-y-2 relative z-10">
                    <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Hormonal Changes</label>
                    <select value={form.Hormonal_Changes} onChange={e => setF('Hormonal_Changes', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                      <option>Normal</option>
                      <option>Postmenopausal</option>
                    </select>
                  </div>
                )}
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Family History</label>
                  <select value={form.Family_History} onChange={e => setF('Family_History', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Medical Conditions</label>
                  <select value={form.Medical_Conditions} onChange={e => setF('Medical_Conditions', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>None</option>
                    <option>Hyperthyroidism</option>
                    <option>Rheumatoid Arthritis</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Medications</label>
                  <select value={form.Medications} onChange={e => setF('Medications', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>None</option>
                    <option>Corticosteroids</option>
                  </select>
                </div>
                <div className="group space-y-2 relative z-10">
                  <label className="text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-teal-700">Prior Fractures</label>
                  <select value={form.Prior_Fractures} onChange={e => setF('Prior_Fractures', e.target.value)} className="w-full bg-white/70 border-2 border-slate-100 text-slate-800 rounded-xl px-4 py-3 outline-none transition-all duration-300 hover:border-teal-200 hover:shadow-md hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] appearance-none cursor-pointer">
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-teal-900/20 hover:shadow-teal-900/40 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 flex items-center justify-center gap-2 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/20 w-full h-full -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12"></div>
                  <Activity size={24} className="relative z-10" /> 
                  <span className="relative z-10">Submit Health Assessment</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Status Header */}
            <div className="glass-panel p-8 text-center animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl"></div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome, {user.name}</h2>
              <p className="text-slate-600">Your health assessment has been submitted securely to your doctor.</p>
              
              {!profile.doctor_request && !profile.prescribed_medication && (
                <div className="mt-6 inline-flex items-center gap-3 bg-teal-50 border border-teal-500/30 rounded-full px-6 py-3">
                  <span className="text-slate-700">Status:</span>
                  <span className="font-bold text-amber-600">Waiting for Doctor's Review...</span>
                </div>
              )}
            </div>

            {/* Appointment Section */}
            <div className="bg-white/60 border border-slate-200 rounded-xl p-6 flex flex-col gap-4 animate-slide-up mt-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Calendar className="text-indigo-600" size={28} />
                <h3 className="text-lg font-bold text-slate-800">Doctor Appointment</h3>
              </div>
              
              {!profile.appointment_requested && !profile.appointment_time && (
                <div>
                  <p className="text-slate-600 mb-4">You can request an appointment with your assigned doctor for a consultation.</p>
                  <button onClick={handleRequestAppointment} className="btn-primary bg-indigo-600 hover:bg-indigo-700">Request Appointment</button>
                </div>
              )}
              
              {profile.appointment_requested && !profile.appointment_time && (
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg text-indigo-800">
                  <span className="font-semibold">Appointment Requested!</span> Waiting for your doctor to assign a time.
                </div>
              )}
              
              {profile.appointment_time && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-green-800">
                  <span className="font-semibold">Appointment Scheduled:</span> {new Date(profile.appointment_time).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Doctor Review & Prescriptions */}
            {(profile.doctor_request === 'Reviewed' || profile.prescribed_medication) && (
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-6 flex gap-4 animate-slide-up">
                <Activity className="text-teal-600 shrink-0" size={28} />
                <div className="w-full">
                  <h3 className="text-lg font-bold text-teal-600 mb-1">
                    {profile.doctor_request === 'Reviewed' ? 'File Reviewed by Doctor' : 'Doctor\'s Orders & Notes'}
                  </h3>
                  {profile.doctor_request === 'Reviewed' && (
                    <p className="text-slate-700 mb-3">Your assigned doctor has reviewed your assessment and file.</p>
                  )}
                  {profile.prescribed_medication && (
                    <div className="bg-white/60 border border-teal-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-teal-700 flex items-center gap-2 mb-2">
                        <Pill size={18} /> Prescription & Advice
                      </h4>
                      <p className="text-slate-700 whitespace-pre-wrap">{profile.prescribed_medication}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chatbot Section */}
            <div className="bg-white/60 border border-slate-200 rounded-xl p-6 flex flex-col gap-4 animate-slide-up mt-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="text-teal-600" size={28} />
                <h3 className="text-lg font-bold text-slate-800">Ask Anything</h3>
              </div>
              <div className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-200">
                <zapier-interfaces-chatbot-embed is-popup="false" chatbot-id="cmr8uxrg5002tkpepo5u4omgi" height="500px" width="100%"></zapier-interfaces-chatbot-embed>
              </div>
            </div>
            
            {/* Doctor Request Alert */}
            {profile.doctor_request && profile.doctor_request !== 'Reviewed' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex gap-4 animate-slide-up">
                <AlertCircle className="text-amber-600 shrink-0" size={28} />
                <div>
                  <h3 className="text-lg font-bold text-amber-600 mb-1">Action Required</h3>
                  <p className="text-slate-700 mb-4">
                    Your assigned doctor has requested a 
                    <strong className="text-slate-800"> {profile.doctor_request === 'DEXA' ? 'DEXA Scan (Bone Density)' : 'Chest X-Ray Scan'}</strong>.
                  </p>
                  <div className="bg-slate-100 p-4 rounded-lg text-sm text-slate-600">
                    Please visit the clinic to get this scan completed. Once completed, your doctor will upload and review the results.
                  </div>
                </div>
              </div>
            )}
            

            
            <div className="pt-6 flex flex-wrap justify-center items-center gap-4 animate-slide-up">
              {profile.pdf_url && (
                <a 
                  href={`${BASE_URL}${profile.pdf_url}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  <FileText size={20} />
                  View Medical Report
                </a>
              )}
              {(!profile.doctor_request && !profile.prescribed_medication && !profile.final_prediction && !profile.is_discharged) ? (
                <button disabled className="btn-secondary border border-slate-300 text-slate-400 bg-slate-50 cursor-not-allowed px-6 py-2 rounded-lg transition-colors" title="Please wait for the doctor to review your current assessment first.">
                  Submit New Assessment
                </button>
              ) : (
                <button onClick={() => setIsRetaking(true)} className="btn-secondary border border-teal-500/30 text-teal-600 hover:bg-teal-500/10 px-6 py-2 rounded-lg transition-colors">
                  Submit New Assessment
                </button>
              )}
            </div>
          </>
        )}

      </main>
    </div>
  );
};

export default PatientDashboard;
