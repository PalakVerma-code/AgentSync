import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Cpu, Users, Layers, Activity, Flame, Zap, Award, 
  Terminal, Search, Plus, AlertTriangle, CheckCircle2, ChevronRight,
  TrendingUp, Compass, Sliders, Bell, Sparkles, X, Send, UserCheck,
  RefreshCw, LogOut, Code, Database, Radio, Bookmark, Check
} from 'lucide-react';

const getAvailabilityPercentage = (operative) => {
  const maxCapacity = operative.maxCapacity > 0 ? operative.maxCapacity : 100;
  return Math.round((Math.max(0, maxCapacity - operative.allocatedCapacity) / maxCapacity) * 100);
};

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const [setupRequired, setSetupRequired] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [authForm, setAuthForm] = useState({
    name: '', email: '', password: '', jobTitle: '', department: '', phone: '', skills: '', bio: ''
  });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [operatives, setOperatives] = useState([]);
  const [projects, setProjects] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileDraft, setProfileDraft] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [users, setUsers] = useState([]);
  const [userAccessError, setUserAccessError] = useState('');

  const activeOperative = useMemo(() => {
    return operatives.find(op => op.accountId === authUser?.id) || operatives[0] || {};
  }, [operatives, authUser]);
  const isEmployee = authUser?.role === 'employee';
  const isAdmin = authUser?.role === 'admin';
  const canManageStaff = authUser?.role === 'admin' || authUser?.role === 'hr';

  const [toasts, setToasts] = useState([]);
  const addToast = (title, message, type = 'cyan') => {
    const id = Date.now();
    setToasts(prev => [{ id, title, message, type }, ...prev].slice(0, 4));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const loadState = async () => {
    const response = await fetch('/api/state');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load workspace data.');
    setOperatives(data.operatives || []);
    setProjects(data.projects || []);
    setAgentLogs(data.telemetry || []);
    setLoading(false);
  };

  const loadUsers = async () => {
    const response = await fetch('/api/users');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load user accounts.');
    setUsers(data.users || []);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const setupResponse = await fetch('/api/auth/setup-status');
        const setupData = await setupResponse.json();
        if (!setupResponse.ok) throw new Error(setupData.error || 'Could not check initial setup.');
        setSetupRequired(setupData.setupRequired);
        if (setupData.setupRequired) {
          setAuthMode('setup');
          setLoading(false);
          setAuthStatus('unauthenticated');
          return;
        }
        const sessionResponse = await fetch('/api/auth/me');
        if (sessionResponse.status === 401) {
          setLoading(false);
          setAuthStatus('unauthenticated');
          return;
        }
        const sessionData = await sessionResponse.json();
        if (!sessionResponse.ok) throw new Error(sessionData.error || 'Could not restore your session.');
        setAuthUser(sessionData.user);
        await loadState();
        setAuthStatus('authenticated');
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Could not connect to the service.');
        setAuthStatus('unauthenticated');
        setLoading(false);
      }
    };
    initialize();
  }, []);

  // RAG States
  const [ragQuery, setRagQuery] = useState('');
  const [ragRunning, setRagRunning] = useState(false);
  const [suggestedTeam, setSuggestedTeam] = useState(null);
  const [hrEmployeeId, setHrEmployeeId] = useState('OP-02');
  const [hrProjectId, setHrProjectId] = useState('');
  const [hrAssessment, setHrAssessment] = useState(null);
  const [hrRunning, setHrRunning] = useState(false);
  const [hrError, setHrError] = useState('');
  const [commanderTab, setCommanderTab] = useState('matrix');
  const [showForgeModal, setShowForgeModal] = useState(false);
  const [newMission, setNewMission] = useState({
    title: '',
    department: 'Autonomous Defense',
    difficulty: 'Tier IV - Mythic',
    budget: '$350,000',
    deadline: '2027-02-01',
    requiredSkills: 'Rust, Zero-Trust, Kubernetes',
    requiredSlots: 3
  });

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    const endpoint = authMode === 'setup' ? '/api/auth/setup-admin'
      : authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    const payload = { ...authForm };
    if (authMode === 'signup') {
      payload.skills = authForm.skills.split(',').map(skill => skill.trim()).filter(Boolean);
    }
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed.');
      setAuthUser(data.user);
      setSetupRequired(false);
      setCommanderTab('matrix');
      await loadState();
      setAuthStatus('authenticated');
      if (data.user.role === 'admin') await loadUsers();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not connect to the service.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('The server could not end your session.');
      setAuthUser(null);
      setOperatives([]);
      setProjects([]);
      setAgentLogs([]);
      setUsers([]);
      setAuthStatus('unauthenticated');
      setAuthMode('signin');
      setCommanderTab('matrix');
    } catch (error) {
      addToast('Sign out failed', error instanceof Error ? error.message : 'Check the service connection.', 'crimson');
    }
  };

  useEffect(() => {
    if (!authUser || activeOperative.accountId !== authUser.id) return;
    setProfileDraft({
      name: activeOperative.name || '',
      jobTitle: activeOperative.role || '',
      department: authUser.profile.department || '',
      phone: authUser.profile.phone || '',
      bio: authUser.profile.bio || '',
      skills: (activeOperative.skills || []).join(', ')
    });
  }, [activeOperative, authUser]);

  useEffect(() => {
    if (isAdmin && authStatus === 'authenticated') {
      loadUsers().catch(error => setUserAccessError(error.message));
    }
  }, [isAdmin, authStatus]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileError('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileDraft,
          skills: profileDraft.skills.split(',').map(skill => skill.trim()).filter(Boolean)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save profile.');
      setAuthUser(data.user);
      setOperatives(prev => prev.map(operative =>
        operative.accountId === data.operative.accountId ? data.operative : operative
      ));
      addToast('Profile updated', 'Your profile details and skills were saved.', 'emerald');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save profile.');
    }
  };

  const updateUserRole = async (userId, role) => {
    setUserAccessError('');
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update account access.');
      setUsers(prev => prev.map(user => user.id === userId ? data.user : user));
    } catch (error) {
      setUserAccessError(error instanceof Error ? error.message : 'Could not update account access.');
    }
  };

  const runHRReview = async () => {
    const employee = operatives.find(op => op.id === hrEmployeeId);
    if (!employee) {
      setHrError('Select an employee with a loaded profile before starting a review.');
      return;
    }

    setHrRunning(true);
    setHrError('');
    setHrAssessment(null);
    try {
      const res = await fetch('/api/hr-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee,
          project: projects.find(project => project.id === hrProjectId) || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'The HR review request failed.');
      }
      setHrAssessment(data);
      setAgentLogs(prev => [...data.logs, ...prev]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error.';
      setHrError(`HR review unavailable: ${message}`);
    } finally {
      setHrRunning(false);
    }
  };

  const runMultiAgentRAG = async (queryText) => {
    const query = queryText || ragQuery;
    if (!query) return;
    setRagRunning(true);
    setSuggestedTeam(null);
    addToast("Staffing analysis started", "Reviewing employee skills and current workload...", "violet");

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Staffing analysis failed.');
      setSuggestedTeam(data.assembledTeam);
      setAgentLogs(prev => [...data.logs, ...prev]);
      addToast("Staffing recommendations ready", "The analysis identified suitable employee candidates.", "emerald");
    } catch (error) {
      addToast("Staffing analysis failed", error instanceof Error ? error.message : "Check the service connection.", "amber");
    } finally {
      setRagRunning(false);
    }
  };

  const toggleAssignment = async (opId, prjId) => {
    try {
      const res = await fetch('/api/matrix/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operativeId: opId, projectId: prjId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update assignments.');
      if (data.success) {
        setOperatives(prev => prev.map(o => o.id === opId ? data.operative : o));
        setProjects(prev => prev.map(p => p.id === prjId ? data.project : p));
        setAgentLogs(prev => [data.log, ...prev]);

        if (data.operative.allocatedCapacity > 100) {
          addToast("Workload review recommended", `${data.operative.name} is assigned above reported capacity (${data.operative.allocatedCapacity}%).`, "crimson");
        } else {
          addToast("Project assignments updated", `${data.operative.name}'s assignments were updated.`, "cyan");
        }
      }
    } catch (error) {
      addToast("Allocation Update Failed", error instanceof Error ? error.message : "Check server connection.", "amber");
    }
  };

  const handleCreateMission = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMission)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create the project.');
      if (data.success) {
        setProjects(prev => [data.project, ...prev]);
        setShowForgeModal(false);
        addToast("Project created", `${data.project.title} was added to the project list.`, "cyan");
      }
    } catch (error) {
      addToast("Project creation failed", error instanceof Error ? error.message : "A network error occurred.", "crimson");
    }
  };

  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center font-mono text-cyan-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading employee and project data...</span>
        </div>
      </div>
    );
  }

  if (!authUser) {
    const isSetup = setupRequired || authMode === 'setup';
    const isSignup = authMode === 'signup' && !isSetup;
    return (
      <main className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4">
        <section className="cyber-glass-glow w-full max-w-xl rounded-3xl border border-[#00f2fe]/30 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/40 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#00f2fe]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {isSetup ? 'Create the first administrator' : isSignup ? 'Create employee account' : 'Sign in'}
              </h1>
              <p className="text-xs font-mono text-slate-400">
                {isSetup ? 'One-time secure workspace setup' : 'Sign in to your authorized workspace'}
              </p>
            </div>
          </div>

          {isSetup && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200">
              Admin access can only be initialized once. Employee accounts cannot select HR or Admin privileges.
            </p>
          )}

          <form onSubmit={handleAuthSubmit} className="grid sm:grid-cols-2 gap-4 font-mono text-xs">
            {(isSetup || isSignup) && (
              <label className="space-y-1.5">
                <span className="block text-slate-300">Full name</span>
                <input required maxLength={100} autoComplete="name" value={authForm.name}
                  onChange={event => setAuthForm({ ...authForm, name: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white" />
              </label>
            )}
            <label className="space-y-1.5">
              <span className="block text-slate-300">Email</span>
              <input required type="email" autoComplete="email" value={authForm.email}
                onChange={event => setAuthForm({ ...authForm, email: event.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white" />
            </label>
            <label className="space-y-1.5">
              <span className="block text-slate-300">Password (at least 10 characters)</span>
              <input required type="password" minLength={10} maxLength={200}
                autoComplete={isSetup || isSignup ? 'new-password' : 'current-password'}
                value={authForm.password}
                onChange={event => setAuthForm({ ...authForm, password: event.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white" />
            </label>
            {isSignup && (
              <>
                <label className="space-y-1.5">
                  <span className="block text-slate-300">Job title</span>
                  <input maxLength={100} value={authForm.jobTitle}
                    onChange={event => setAuthForm({ ...authForm, jobTitle: event.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white" />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-slate-300">Department</span>
                  <input maxLength={100} value={authForm.department}
                    onChange={event => setAuthForm({ ...authForm, department: event.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white" />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-slate-300">Phone</span>
                  <input maxLength={40} autoComplete="tel" value={authForm.phone}
                    onChange={event => setAuthForm({ ...authForm, phone: event.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white" />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-slate-300">Skills (comma-separated)</span>
                  <input maxLength={500} value={authForm.skills}
                    onChange={event => setAuthForm({ ...authForm, skills: event.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white" />
                </label>
                <label className="sm:col-span-2 space-y-1.5">
                  <span className="block text-slate-300">Profile summary</span>
                  <textarea maxLength={500} rows={3} value={authForm.bio}
                    onChange={event => setAuthForm({ ...authForm, bio: event.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white resize-y" />
                </label>
              </>
            )}
            {authError && <p role="alert" className="sm:col-span-2 text-xs text-rose-300">{authError}</p>}
            <button disabled={authBusy} className="sm:col-span-2 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00f5d4] px-4 py-3 font-bold uppercase tracking-wider text-black disabled:opacity-60">
              {authBusy ? 'Please wait...' : isSetup ? 'Set up administrator' : isSignup ? 'Create employee account' : 'Sign in'}
            </button>
          </form>

          {!isSetup && (
            <button type="button" onClick={() => {
              setAuthError('');
              setAuthMode(isSignup ? 'signin' : 'signup');
            }} className="w-full text-center text-xs text-cyan-300 hover:text-white">
              {isSignup ? 'Already have an account? Sign in' : 'New employee? Create an account'}
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col relative font-sans">
      
      {/* STATUS NOTIFICATIONS */}
      <div className="fixed top-20 right-6 z-50 space-y-3 pointer-events-none w-80">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border transition-all duration-300 shadow-2xl ${
              toast.type === 'crimson' 
                ? 'bg-red-950/90 border-[#ff0055]/50 text-red-200 shadow-[#ff0055]/20'
                : toast.type === 'amber'
                ? 'bg-amber-950/90 border-[#ffb703]/50 text-amber-200 shadow-[#ffb703]/20'
                : toast.type === 'emerald'
                ? 'bg-emerald-950/90 border-[#00f5d4]/50 text-emerald-200 shadow-[#00f5d4]/20'
                : toast.type === 'violet'
                ? 'bg-purple-950/90 border-[#9d4edd]/50 text-purple-200 shadow-[#9d4edd]/20'
                : 'bg-cyan-950/90 border-[#00f2fe]/50 text-cyan-200 shadow-[#00f2fe]/20'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold tracking-wider uppercase mb-1">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" /> {toast.title}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* GLOBAL NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-xl border-b border-[#00f2fe]/20 px-4 sm:px-8 h-18 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00f2fe]/20 to-[#9d4edd]/20 border border-[#00f2fe]/50 flex items-center justify-center text-[#00f2fe] shadow-[0_0_15px_rgba(0,242,254,0.25)]">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-base md:text-lg font-extrabold tracking-wide text-white uppercase leading-tight max-w-[180px] sm:max-w-none">
                Workflow Decision Making System
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/30">
                Decision support
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 tracking-wider hidden sm:block">
              Employee workload, staffing, and project planning
            </p>
          </div>
        </div>

        {/* Global Telemetry Strip */}
        <div className="hidden lg:flex items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2 bg-[#0d111a] px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-ping"></span>
            <span className="text-slate-400">EMPLOYEES:</span>
            <span className="text-white font-bold">{operatives.length}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#0d111a] px-3 py-1.5 rounded-lg border border-slate-800">
            <Flame className="w-3.5 h-3.5 text-[#ff0055]" />
            <span className="text-slate-400">OVER CAPACITY:</span>
            <span className="text-[#ff0055] font-bold">
              {operatives.filter(o => o.allocatedCapacity > 100).length}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#0d111a] px-3 py-1.5 rounded-lg border border-slate-800">
            <Shield className="w-3.5 h-3.5 text-[#9d4edd]" />
            <span className="text-slate-400">STAFFING SERVICE:</span>
            <span className="text-[#00f2fe] font-bold">Online</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-white">{authUser.profile.name}</div>
            <div className="text-[10px] font-mono uppercase text-slate-400">{authUser.role}</div>
          </div>
          <button onClick={handleLogout} className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white flex items-center gap-2 text-xs font-bold">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

      </header>

      {/* ============================================================== */}
      {/* MANAGER VIEW                                                   */}
      {/* ============================================================== */}
      {canManageStaff && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
          
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCommanderTab('matrix')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                  commanderTab === 'matrix'
                    ? 'bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/40 shadow-[0_0_12px_rgba(0,242,254,0.15)]'
                    : 'bg-[#0d111a] text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" /> Workload & assignments
              </button>

              <button
                onClick={() => setCommanderTab('forge')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                  commanderTab === 'forge'
                    ? 'bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/40 shadow-[0_0_12px_rgba(0,242,254,0.15)]'
                    : 'bg-[#0d111a] text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4" /> Projects ({projects.length})
              </button>

              <button
                onClick={() => setCommanderTab('agents')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                  commanderTab === 'agents'
                    ? 'bg-[#9d4edd]/20 text-[#9d4edd] border border-[#9d4edd]/50 shadow-[0_0_15px_rgba(157,78,221,0.2)]'
                    : 'bg-[#0d111a] text-purple-300 border border-purple-900/40 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" /> Staffing recommendations
              </button>

              <button
                onClick={() => setCommanderTab('hr')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                  commanderTab === 'hr'
                    ? 'bg-[#00f5d4]/10 text-[#00f5d4] border border-[#00f5d4]/40'
                    : 'bg-[#0d111a] text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Employee review
              </button>

              {isAdmin && (
                <button
                  onClick={() => setCommanderTab('access')}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                    commanderTab === 'access'
                      ? 'bg-[#9d4edd]/20 text-[#c77dff] border border-[#9d4edd]/50'
                      : 'bg-[#0d111a] text-purple-300 border border-purple-900/40 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" /> User access
                </button>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowForgeModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00f5d4] text-black font-bold text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:brightness-110 transition"
              >
                <Plus className="w-4 h-4" /> Create project
              </button>
            )}
          </div>

          {commanderTab === 'access' && isAdmin && (
            <section className="cyber-glass p-6 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Account access</h3>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Employee accounts can be promoted to HR. Administrator access is only created during initial setup.
                </p>
              </div>
              {userAccessError && <p role="alert" className="text-xs text-rose-300">{userAccessError}</p>}
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/70 border border-slate-800 p-4">
                    <div>
                      <div className="text-sm font-bold text-white">{user.name}</div>
                      <div className="text-xs font-mono text-slate-400">{user.email}</div>
                    </div>
                    <select
                      aria-label={`Access role for ${user.name}`}
                      value={user.role}
                      disabled={user.id === authUser.id || user.role === 'admin'}
                      onChange={event => updateUserRole(user.id, event.target.value)}
                      className="rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2 text-xs text-white disabled:opacity-60"
                    >
                      <option value="employee">Employee</option>
                      <option value="hr">HR</option>
                      {user.role === 'admin' && <option value="admin">Admin</option>}
                    </select>
                  </div>
                ))}
                {!users.length && <p className="text-xs text-slate-500">No registered accounts yet.</p>}
              </div>
            </section>
          )}

          {/* TAB 1: WORKLOAD AND ASSIGNMENTS */}
          {commanderTab === 'matrix' && (
            <div className="space-y-6">
              <div className="cyber-glass p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-[#00f2fe]/20">
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#00f2fe]" /> Employee availability and project skill match
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Review remaining work capacity and assigned-project skill coverage before making staffing changes.
                  </p>
                </div>
              </div>

              <div className="cyber-glass rounded-2xl overflow-hidden border border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0a0f18] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-4">Employee</th>
                        <th className="p-4">Skills</th>
                        <th className="p-4">Work availability</th>
                        <th className="p-4">Project assignments (select to update)</th>
                        <th className="p-4 text-right">Skill match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {operatives.map(op => {
                        const maxCapacity = op.maxCapacity || 100;
                        const availabilityPercentage = getAvailabilityPercentage(op);
                        const overCapacityBy = Math.max(0, op.allocatedCapacity - maxCapacity);
                        const assignedProjects = projects.filter(prj => op.assignedProjects.includes(prj.id));
                        const requiredSkills = assignedProjects.flatMap(prj => prj.requiredSkills);
                        const matchedSkills = requiredSkills.filter(requiredSkill =>
                          op.skills.some(skill => skill.toLowerCase() === requiredSkill.toLowerCase())
                        ).length;
                        const skillMatch = requiredSkills.length
                          ? Math.round((matchedSkills / requiredSkills.length) * 100)
                          : null;

                        return (
                          <tr key={op.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {op.avatar ? (
                                  <img src={op.avatar} alt="" className="w-9 h-9 rounded-xl object-cover border border-[#00f2fe]/40" />
                                ) : (
                                  <span className="w-9 h-9 rounded-xl border border-[#00f2fe]/40 bg-slate-900 text-[#00f2fe] flex items-center justify-center font-bold">
                                    {op.name.slice(0, 1)}
                                  </span>
                                )}
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    {op.name}
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-[#00f2fe]">
                                      {op.id}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">{op.role}</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {op.skills.map(skill => (
                                  <span key={skill} className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="space-y-1.5 min-w-[120px]">
                                <div className="flex justify-between items-center text-[11px]">
                                  <span className={`font-bold ${overCapacityBy ? 'text-[#ff0055]' : 'text-[#00f5d4]'}`}>
                                    {availabilityPercentage}% available
                                  </span>
                                  {overCapacityBy > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055]/40 animate-pulse">
                                      {overCapacityBy}% over
                                    </span>
                                  )}
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-500 ${overCapacityBy ? 'bg-[#ff0055]' : 'bg-[#00f5d4]'}`}
                                    style={{ width: `${availabilityPercentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="flex flex-wrap gap-1.5">
                                {projects.map(prj => {
                                  const isAssigned = op.assignedProjects.includes(prj.id);
                                  return (
                                    <button
                                      key={prj.id}
                                      onClick={() => toggleAssignment(op.id, prj.id)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all flex items-center gap-1 ${
                                        isAssigned
                                          ? 'bg-[#00f2fe] text-black shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'
                                      }`}
                                    >
                                      {isAssigned && <Check className="w-3 h-3" />}
                                      {prj.codename}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            <td className="p-4 text-right">
                              {skillMatch === null ? (
                                <span className="font-mono text-xs text-slate-500">
                                  {op.assignedProjects.length ? 'Skill data unavailable' : 'No assigned projects'}
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-2 min-w-[120px] justify-end">
                                  <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#00f2fe] transition-all duration-500" style={{ width: `${skillMatch}%` }} />
                                  </div>
                                  <span className="font-mono text-xs font-bold text-[#00f2fe]">{skillMatch}%</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECTS */}
          {commanderTab === 'forge' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(prj => {
                const assignedCount = prj.assignedOperativeIds.length;
                const isUnderstaffed = assignedCount < prj.requiredSlots;

                return (
                  <div key={prj.id} className="cyber-glass p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-5 hover:border-[#00f2fe]/40 transition group">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono mb-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[#00f2fe] border border-slate-700">
                          {prj.codename}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          prj.priority === 'CRITICAL' 
                            ? 'bg-red-950 text-[#ff0055] border border-red-800' 
                            : 'bg-amber-950 text-[#ffb703] border border-amber-800'
                        }`}>
                          {prj.priority.toLowerCase()}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-[#00f2fe] transition">
                        {prj.title}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-1">{prj.department} • {prj.difficulty}</p>

                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {prj.requiredSkills.map(skill => (
                          <span key={skill} className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Team size:</span>
                        <span className={`font-bold ${isUnderstaffed ? 'text-[#ffb703]' : 'text-[#00f5d4]'}`}>
                          {assignedCount} / {prj.requiredSlots} assigned
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-400">
                        <span>Budget / deadline:</span>
                        <span className="text-white font-bold">{prj.budget} • {prj.deadline}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button 
                          onClick={() => {
                            setCommanderTab('agents');
                            runMultiAgentRAG(`Assemble team for ${prj.title} requiring ${prj.requiredSkills.join(', ')}`);
                          }}
                          className="w-full py-2 rounded-lg bg-[#9d4edd]/20 text-[#9d4edd] border border-[#9d4edd]/40 text-xs font-bold hover:bg-[#9d4edd]/40 transition flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Suggest employees
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: STAFFING RECOMMENDATIONS */}
          {commanderTab === 'agents' && (
            <div className="space-y-6">
              <div className="cyber-glass-violet p-6 rounded-2xl border border-[#9d4edd]/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                    <Terminal className="w-5 h-5 text-[#9d4edd]" />
                    <span>Staffing recommendations</span>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    Service ready
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder="Describe the project skills and workload limits to consider..."
                    className="flex-1 bg-slate-950/80 border border-purple-900/60 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00f2fe]"
                  />
                  <button
                    onClick={() => runMultiAgentRAG()}
                    disabled={ragRunning}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#9d4edd] to-[#00f2fe] text-black font-bold text-xs tracking-wider uppercase flex items-center gap-2 hover:brightness-110 transition disabled:opacity-50"
                  >
                    {ragRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Get recommendations</span>
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 cyber-glass p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#00f2fe]" /> Analysis activity
                  </h4>

                  <div className="space-y-3 font-mono text-xs max-h-[380px] overflow-y-auto">
                    {agentLogs.map((log, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#9d4edd]">{log.agent}</span>
                          <span className="text-[10px] text-slate-500">{log.time}</span>
                        </div>
                        <div className="text-xs text-white font-semibold">{log.action}</div>
                        <p className="text-[11px] text-slate-400">{log.detail}</p>
                        <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded bg-slate-800 text-[#00f5d4] border border-slate-700">
                          {log.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-6 cyber-glass p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#00f5d4]" /> Suggested employees
                  </h4>

                  {suggestedTeam ? (
                    <div className="space-y-3">
                      {suggestedTeam.map(cand => (
                        <div key={cand.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between font-mono text-xs">
                          <div className="flex items-center gap-3">
                            {cand.avatar ? (
                              <img src={cand.avatar} alt="" className="w-9 h-9 rounded-xl object-cover border border-[#00f5d4]" />
                            ) : (
                              <span className="w-9 h-9 rounded-xl border border-[#00f5d4] bg-slate-950 text-[#00f5d4] flex items-center justify-center font-bold">
                                {cand.name.slice(0, 1)}
                              </span>
                            )}
                            <div>
                              <div className="font-bold text-white">{cand.name}</div>
                              <span className="text-[10px] text-slate-400">{cand.role}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-[#00f5d4]">{cand.fitScore}% skill match</div>
                            <span className="text-[10px] text-slate-400">
                              {getAvailabilityPercentage(cand)}% available
                            </span>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          addToast("Recommendations reviewed", "Confirm assignments with employees and project leads.", "emerald");
                          setSuggestedTeam(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/40 text-[#00f5d4] font-bold text-xs uppercase hover:bg-[#00f5d4]/20 transition"
                      >
                        Review recommendations
                      </button>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      Enter staffing requirements above or request suggestions from a project card.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {commanderTab === 'hr' && (
            <section className="space-y-6" aria-labelledby="hr-review-heading">
              <div className="cyber-glass-violet p-6 rounded-2xl border border-[#9d4edd]/40 space-y-5">
                <div>
                  <h3 id="hr-review-heading" className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#00f5d4]" /> Employee situation review
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-2">
                    Review reported workload, project skill fit, performance snapshots, and operational check-in prompts.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-[11px] font-mono text-slate-400 space-y-2">
                    <span className="block">Employee profile</span>
                    <select
                      value={hrEmployeeId}
                      onChange={(event) => {
                        setHrEmployeeId(event.target.value);
                        setHrAssessment(null);
                      }}
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    >
                      {operatives.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} — {employee.role}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-[11px] font-mono text-slate-400 space-y-2">
                    <span className="block">Project skill fit (optional)</span>
                    <select
                      value={hrProjectId}
                      onChange={(event) => {
                        setHrProjectId(event.target.value);
                        setHrAssessment(null);
                      }}
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    >
                      <option value="">No project selected</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  onClick={runHRReview}
                  disabled={hrRunning || operatives.length === 0}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#9d4edd] to-[#00f5d4] text-black font-bold text-xs tracking-wider uppercase flex items-center gap-2 hover:brightness-110 transition disabled:opacity-50"
                >
                  {hrRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  {hrRunning ? 'Reviewing profile' : 'Run employee review'}
                </button>
                {hrError && (
                  <p role="alert" className="text-xs font-mono text-rose-300">{hrError}</p>
                )}
              </div>

              {hrAssessment && (
                <div className="space-y-4">
                  <div className="cyber-glass p-4 rounded-xl border border-slate-800">
                    <div className="text-sm font-bold text-white">
                      {hrAssessment.employee.name}
                      {hrAssessment.employee.role && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {hrAssessment.employee.role}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-2">{hrAssessment.disclaimer}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {hrAssessment.agents.map(agent => (
                      <article key={agent.agent} className="cyber-glass p-5 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-white">{agent.agent}</h4>
                          <span className="text-[9px] font-mono px-2 py-1 rounded bg-purple-950/70 text-purple-200 border border-purple-800/70">
                            {agent.status.replaceAll('_', ' ').toLowerCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{agent.summary}</p>
                        {agent.evidence.length > 0 && (
                          <ul className="space-y-1 text-[11px] font-mono text-slate-400 list-disc pl-4">
                            {agent.evidence.map((item, index) => <li key={index}>{item}</li>)}
                          </ul>
                        )}
                        {agent.recommendations.length > 0 && (
                          <div className="pt-2 border-t border-slate-800">
                            <div className="text-[9px] font-mono text-[#00f5d4] mb-1">
                              Suggested discussion
                            </div>
                            <ul className="space-y-1 text-[11px] text-slate-300">
                              {agent.recommendations.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

        </main>
      )}

      {/* ============================================================== */}
      {/* EMPLOYEE VIEW                                                  */}
      {/* ============================================================== */}
      {isEmployee && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
          
          <div className="cyber-glass-glow p-6 sm:p-8 rounded-3xl border border-[#00f2fe]/30 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                {activeOperative.avatar ? (
                  <img src={activeOperative.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-[#00f2fe] shadow-[0_0_20px_rgba(0,242,254,0.3)]" />
                ) : (
                  <span className="w-20 h-20 rounded-2xl border-2 border-[#00f2fe] bg-slate-900 text-[#00f2fe] shadow-[0_0_20px_rgba(0,242,254,0.3)] flex items-center justify-center text-3xl font-bold">
                    {(activeOperative.name || authUser.profile.name).slice(0, 1)}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white tracking-wide">{activeOperative.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-[#9d4edd]/20 text-[#9d4edd] border border-[#9d4edd]/40">
                    Employee ID: {activeOperative.id}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  {activeOperative.role}{authUser.profile.department ? ` · ${authUser.profile.department}` : ''}
                </p>
                {authUser.profile.bio && <p className="text-xs text-slate-300 mt-2 max-w-2xl">{authUser.profile.bio}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(activeOperative.skills || []).map(s => (
                    <span key={s} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-[#00f2fe] border border-slate-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <span className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 font-mono text-xs text-slate-300">
              {authUser.email}
            </span>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <form onSubmit={saveProfile} className="cyber-glass p-6 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">My profile</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Update your details and skills for staffing recommendations.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 font-mono text-xs">
                  <label className="space-y-1">
                    <span className="block text-slate-400">Full name</span>
                    <input required maxLength={100} value={profileDraft?.name || ''}
                      onChange={event => setProfileDraft({ ...profileDraft, name: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2 text-white" />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-slate-400">Job title</span>
                    <input maxLength={100} value={profileDraft?.jobTitle || ''}
                      onChange={event => setProfileDraft({ ...profileDraft, jobTitle: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2 text-white" />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-slate-400">Department</span>
                    <input maxLength={100} value={profileDraft?.department || ''}
                      onChange={event => setProfileDraft({ ...profileDraft, department: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2 text-white" />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-slate-400">Phone</span>
                    <input maxLength={40} value={profileDraft?.phone || ''}
                      onChange={event => setProfileDraft({ ...profileDraft, phone: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2 text-white" />
                  </label>
                  <label className="sm:col-span-2 space-y-1">
                    <span className="block text-slate-400">Skills (comma-separated)</span>
                    <input maxLength={500} value={profileDraft?.skills || ''}
                      onChange={event => setProfileDraft({ ...profileDraft, skills: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2 text-white" />
                  </label>
                  <label className="sm:col-span-2 space-y-1">
                    <span className="block text-slate-400">Profile summary</span>
                    <textarea maxLength={500} rows={3} value={profileDraft?.bio || ''}
                      onChange={event => setProfileDraft({ ...profileDraft, bio: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2 text-white resize-y" />
                  </label>
                </div>
                {profileError && <p role="alert" className="text-xs text-rose-300">{profileError}</p>}
                <button className="rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/40 px-4 py-2 text-xs font-bold uppercase text-[#00f2fe] hover:bg-[#00f2fe]/20">
                  Save profile
                </button>
              </form>

              <div className="cyber-glass p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center font-mono">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#00f2fe]" /> Work availability
                  </h3>
                  <span className={`text-xs font-bold ${
                    activeOperative.allocatedCapacity > (activeOperative.maxCapacity || 100) ? 'text-[#ff0055]' : 'text-[#00f5d4]'
                  }`}>
                    {getAvailabilityPercentage(activeOperative)}% available
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-400">
                  Availability reflects remaining capacity after current project assignments.
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="cyber-glass p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#00f2fe]" /> Assigned projects
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {(activeOperative.assignedProjects || []).length} projects
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {(activeOperative.assignedProjects || []).map(prjId => {
                    const prj = projects.find(p => p.id === prjId);
                    if (!prj) return null;
                    return (
                      <div key={prj.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                        <span className="font-bold text-white">{prj.title}</span>
                        <span className="text-[#00f2fe]">{prj.progress}% complete</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </main>
      )}

      {/* MODAL: CREATE PROJECT */}
      {showForgeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cyber-glass-glow w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-[#00f2fe]/40 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#00f2fe]" /> Create a project
              </h3>
              <button onClick={() => setShowForgeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Project title</label>
                <input 
                  type="text" required
                  placeholder="e.g. Customer onboarding workflow"
                  value={newMission.title}
                  onChange={(e) => setNewMission({ ...newMission, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#00f2fe]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <input 
                    type="text"
                    value={newMission.department}
                    onChange={(e) => setNewMission({ ...newMission, department: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#00f2fe]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Budget</label>
                  <input 
                    type="text"
                    value={newMission.budget}
                    onChange={(e) => setNewMission({ ...newMission, budget: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#00f2fe]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Required skills (comma separated)</label>
                <input 
                  type="text"
                  placeholder="Rust, Kubernetes, Zero-Trust"
                  value={newMission.requiredSkills}
                  onChange={(e) => setNewMission({ ...newMission, requiredSkills: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#00f2fe]"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForgeModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00f5d4] text-black font-bold uppercase tracking-wider hover:brightness-110 transition shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                >
                  Create project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
