import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../../utils/api';

function BoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="4" width="8" height="56" rx="4" fill="currentColor" opacity="0.9"/>
      <rect x="4" y="28" width="56" height="8" rx="4" fill="currentColor" opacity="0.9"/>
    </svg>
  );
}

export default function Sidebar({ links, activeKey, setActiveKey, role, userName }) {
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const roleColors = {
    Patient: 'from-primary-800 to-primary-700',
    Doctor: 'from-teal-800 to-teal-700',
    Admin: 'from-slate-800 to-slate-700',
    QueryManager: 'from-violet-800 to-violet-700',
  };

  const gradient = roleColors[role] || 'from-primary-800 to-primary-700';

  return (
    <div className={`w-64 min-h-screen bg-gradient-to-b ${gradient} flex flex-col`}>
      {/* Brand */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white">
            <BoneIcon />
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">OsteoCare</div>
            <div className="text-white/50 text-xs">{role} Portal</div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(link => (
          <button
            key={link.key}
            onClick={() => setActiveKey(link.key)}
            className={`sidebar-link w-full ${activeKey === link.key ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
          >
            <span className="text-lg">{link.icon}</span>
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-4 py-3 mb-2 rounded-xl bg-white/10">
          <p className="text-white text-sm font-semibold truncate">{userName || session?.user?.name}</p>
          <p className="text-white/50 text-xs">{role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link sidebar-link-inactive w-full"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
