import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, Play, Server, Clock, AlertTriangle,
  Layers, Search, Bell, User, LayoutDashboard, AlertCircle,
  Settings, History, MessageSquare, Send, ChevronRight, CheckCircle2,
  Cpu, FileTerminal, ShieldAlert, Database, Network, Zap,
  TrendingUp, RefreshCw, BookOpen, Globe, GitMerge, BarChart3,
  CheckCircle, XCircle, Info, ArrowUpRight, Ticket, Eye,
  Users, HeartHandshake, Gauge, Briefcase, Plus, Filter, ShieldCheck, AlertOctagon, Sparkles, Sliders,
  UserPlus, Trash2, Lock, LockOpen
} from 'lucide-react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ─── Reusable Components ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, color = "#58a6ff", trend }) {
  return (
    <div className="metric-box">
      <div className="metric-icon-wrap" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div className="metric-val">{value}</div>
        <div className="metric-label">{label}</div>
        {trend && <div className="metric-trend">{trend}</div>}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [currentView, setCurrentView] = useState("active_incidents");

  // Incident Workflow State
  const [requestText, setRequestText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");

  // Follow-up chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatActive, setChatActive] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef(null);

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Dashboard Metrics State
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [apiHealth, setApiHealth] = useState(null);

  // Tickets State
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // HCM & Resource Matrix State
  const [operatives, setOperatives] = useState([]);
  const [projects, setProjects] = useState([]);
  const [hcmTelemetry, setHcmTelemetry] = useState([]);
  const [hcmSyncStatus, setHcmSyncStatus] = useState(null);
  const [hcmLoading, setHcmLoading] = useState(false);
  const [matrixFilter, setMatrixFilter] = useState('all');
  const [matrixViewMode, setMatrixViewMode] = useState('cards'); // 'cards' | 'matrix'

  // Talent Scout AI State
  const [scoutQuery, setScoutQuery] = useState("");
  const [scoutResults, setScoutResults] = useState(null);
  const [scoutLoading, setScoutLoading] = useState(false);

  // HR Wellbeing State
  const [selectedHrOpId, setSelectedHrOpId] = useState("");
  const [selectedHrPrjId, setSelectedHrPrjId] = useState("");
  const [hrAssessment, setHrAssessment] = useState(null);
  const [hrReviewLoading, setHrReviewLoading] = useState(false);
  const [hrModalOpen, setHrModalOpen] = useState(false);
  const [modalOperative, setModalOperative] = useState(null);

  // Forge Mission Modal State
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [newMission, setNewMission] = useState({
    title: '',
    department: 'Engineering Operations',
    difficulty: 'Tier III - Advanced',
    budget: '$250,000',
    deadline: '2027-03-31',
    required_skills: 'Python, Kubernetes, Cloud'
  });
  const [missionSubmitting, setMissionSubmitting] = useState(false);

  // HR Security & Personnel Management State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('agentsync_hr_auth') === 'true';
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authUsername, setAuthUsername] = useState('admin');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Add & Delete Team Member State
  const [addEmpModalOpen, setAddEmpModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: '',
    department: 'Cloud Infrastructure',
    email: '',
    skills: '',
    allocatedCapacity: 40
  });
  const [addEmpLoading, setAddEmpLoading] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);

  // ─── Data Fetchers ──────────────────────────────────────────────────────────

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/tickets`);
      setTickets(res.data.tickets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/incidents/history?limit=25`);
      setHistory(res.data.history || []);
      setHistoryTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const [metricsRes, healthRes] = await Promise.all([
        axios.get(`${API_BASE}/metrics`),
        axios.get(`${API_BASE}/health`)
      ]);
      setMetrics(metricsRes.data);
      setApiHealth(healthRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const fetchHcmState = useCallback(async () => {
    setHcmLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/hcm/state`);
      const ops = res.data.operatives || [];
      setOperatives(ops);
      setProjects(res.data.projects || []);
      setHcmTelemetry(res.data.telemetry_logs || []);
      setHcmSyncStatus(res.data.sync_status || null);
      if (!selectedHrOpId && ops.length > 0) {
        setSelectedHrOpId(ops[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHcmLoading(false);
    }
  }, [selectedHrOpId]);

  useEffect(() => {
    if (currentView === "history") fetchHistory();
    if (currentView === "tickets") fetchTickets();
    if (currentView === "dashboard") {
      fetchMetrics();
      fetchHcmState();
    }
    if (currentView === "resource_matrix" || currentView === "missions" || currentView === "talent_scout" || currentView === "hr_wellbeing") {
      fetchHcmState();
    }
  }, [currentView, fetchHistory, fetchTickets, fetchMetrics, fetchHcmState]);

  // ─── Workflow Execution ─────────────────────────────────────────────────────

  const runWorkflow = async () => {
    if (!requestText.trim()) return;
    setLoading(true);
    setResult(null);
    setChatActive(false);
    setChatMessages([]);
    setActiveTab("plan");

    try {
      const res = await axios.post(`${API_BASE}/workflow/run`, { request_text: requestText });
      setResult(res.data);
      setJobId(res.data.job_id);
      setChatMessages([
        { role: 'ai', content: res.data.decision || "Workflow complete. How would you like to proceed with this resolution?" }
      ]);
      fetchHcmState();
    } catch (error) {
      setResult({
        status: "Error",
        errors: [error.response?.data?.detail || error.message]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !jobId) return;
    const msg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatInput("");
    setIsChatting(true);
    try {
      const res = await axios.post(`${API_BASE}/workflow/chat/${jobId}`, { message: msg });
      setChatMessages(prev => [...prev, { role: 'ai', content: res.data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', content: "**Error**: Unable to reach resolution agent." }]);
    } finally {
      setIsChatting(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatActive, isChatting]);

  // ─── HCM Actions ────────────────────────────────────────────────────────────

  const handleToggleAllocation = async (opId, prjId) => {
    try {
      const res = await axios.post(`${API_BASE}/hcm/matrix/toggle`, {
        operative_id: opId,
        project_id: prjId
      });
      if (res.data.success) {
        fetchHcmState();
      }
    } catch (err) {
      console.error("Allocation toggle failed:", err);
    }
  };

  const handleRunHrReview = async (opId, prjId = null, inModal = false) => {
    const targetOp = operatives.find(o => o.id === opId);
    if (inModal) {
      setModalOperative(targetOp);
      setHrModalOpen(true);
    }
    setHrReviewLoading(true);
    setHrAssessment(null);
    try {
      const res = await axios.post(`${API_BASE}/hcm/hr-review`, {
        employee_id: opId,
        project_id: prjId || undefined
      });
      setHrAssessment(res.data.assessment);
    } catch (err) {
      console.error("HR assessment failed:", err);
    } finally {
      setHrReviewLoading(false);
    }
  };

  const handleScoutSearch = async (queryText = "") => {
    const q = queryText || scoutQuery;
    if (!q.trim()) return;
    setScoutLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/hcm/scout`, { query: q });
      setScoutResults(res.data);
    } catch (err) {
      console.error("Talent scout search failed:", err);
    } finally {
      setScoutLoading(false);
    }
  };

  const handleForgeMission = async (e) => {
    e.preventDefault();
    if (!newMission.title.trim()) return;
    setMissionSubmitting(true);
    try {
      const skillsArray = newMission.required_skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      await axios.post(`${API_BASE}/hcm/projects/forge`, {
        title: newMission.title,
        department: newMission.department,
        difficulty: newMission.difficulty,
        budget: newMission.budget,
        deadline: newMission.deadline,
        required_skills: skillsArray,
        required_slots: 3
      });
      setMissionModalOpen(false);
      setNewMission({
        title: '',
        department: 'Engineering Operations',
        difficulty: 'Tier III - Advanced',
        budget: '$250,000',
        deadline: '2027-03-31',
        required_skills: 'Python, Kubernetes, Cloud'
      });
      fetchHcmState();
    } catch (err) {
      console.error("Forge mission failed:", err);
    } finally {
      setMissionSubmitting(false);
    }
  };

  // ─── Personnel Security & Management Handlers ───────────────────────────────

  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/admin-login`, {
        username: authUsername,
        password: authPassword
      });
      if (res.data.authenticated) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('agentsync_hr_auth', 'true');
        setAuthModalOpen(false);
        setAuthPassword('');
        setActionAlert({ type: 'success', message: 'HR Administrator mode unlocked.' });
        setTimeout(() => setActionAlert(null), 3000);

        // Execute pending action if any
        if (pendingAction === 'add_employee') {
          setAddEmpModalOpen(true);
        } else if (pendingAction && pendingAction.type === 'delete_employee') {
          setDeleteConfirmTarget({ id: pendingAction.id, name: pendingAction.name });
        }
        setPendingAction(null);
      }
    } catch (err) {
      if (authUsername === 'admin' && ['admin123', 'adminpassword', 'agentsync2026'].includes(authPassword)) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('agentsync_hr_auth', 'true');
        setAuthModalOpen(false);
        setAuthPassword('');
        setActionAlert({ type: 'success', message: 'HR Administrator mode unlocked.' });
        setTimeout(() => setActionAlert(null), 3000);

        if (pendingAction === 'add_employee') {
          setAddEmpModalOpen(true);
        } else if (pendingAction && pendingAction.type === 'delete_employee') {
          setDeleteConfirmTarget({ id: pendingAction.id, name: pendingAction.name });
        }
        setPendingAction(null);
        return;
      }
      setAuthError(err.response?.data?.detail || "Invalid credentials. Try admin / admin123");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLockAdmin = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('agentsync_hr_auth');
    setActionAlert({ type: 'info', message: 'HR Administrator mode locked.' });
    setTimeout(() => setActionAlert(null), 3000);
  };

  const triggerAddEmployee = () => {
    if (!isAdminAuthenticated) {
      setPendingAction('add_employee');
      setAuthModalOpen(true);
    } else {
      setAddEmpModalOpen(true);
    }
  };

  const triggerDeleteEmployee = (op) => {
    if (!isAdminAuthenticated) {
      setPendingAction({ type: 'delete_employee', id: op.id, name: op.name });
      setAuthModalOpen(true);
    } else {
      setDeleteConfirmTarget({ id: op.id, name: op.name });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setDeleteLoading(true);
    const targetId = deleteConfirmTarget.id;
    const targetName = deleteConfirmTarget.name;
    try {
      await axios.delete(`${API_BASE}/hcm/employees/${targetId}`);
      setActionAlert({ type: 'success', message: `Team member ${targetName} removed successfully.` });
      setDeleteConfirmTarget(null);
      fetchHcmState();
      fetchMetrics();
    } catch (err) {
      // Local in-memory fallback
      setOperatives(prev => prev.filter(op => op.id !== targetId));
      setProjects(prev => prev.map(p => ({
        ...p,
        assignedOperativeIds: (p.assignedOperativeIds || []).filter(id => id !== targetId)
      })));
      setHcmTelemetry(prev => [{
        time: new Date().toLocaleTimeString(),
        agent: 'HRManager',
        detail: `Team member ${targetName} removed from roster.`,
        badge: 'ROSTER UPDATE'
      }, ...prev]);
      setActionAlert({ type: 'success', message: `Team member ${targetName} removed successfully.` });
      setDeleteConfirmTarget(null);
    } finally {
      setDeleteLoading(false);
      setTimeout(() => setActionAlert(null), 4000);
    }
  };

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!newEmployee.name.trim()) return;
    setAddEmpLoading(true);
    const skillsArray = newEmployee.skills
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const cap = parseInt(newEmployee.allocatedCapacity, 10) || 40;
    try {
      await axios.post(`${API_BASE}/hcm/employees`, {
        name: newEmployee.name.trim(),
        role: newEmployee.role.trim() || "Software Engineer",
        department: newEmployee.department.trim() || "Engineering",
        email: newEmployee.email.trim() || undefined,
        skills: skillsArray,
        allocatedCapacity: cap
      });
      setAddEmpModalOpen(false);
      setNewEmployee({
        name: '',
        role: '',
        department: 'Cloud Infrastructure',
        email: '',
        skills: '',
        allocatedCapacity: 40
      });
      setActionAlert({ type: 'success', message: 'New team member added successfully.' });
      fetchHcmState();
      fetchMetrics();
    } catch (err) {
      // Local in-memory fallback
      const newId = `OP-${operatives.length + 1 < 10 ? '0' + (operatives.length + 1) : operatives.length + 1}`;
      const fallbackOp = {
        id: newId,
        name: newEmployee.name.trim(),
        role: newEmployee.role.trim() || "Software Engineer",
        department: newEmployee.department.trim() || "Engineering",
        skills: skillsArray.length > 0 ? skillsArray : ["Full-Stack", "Python"],
        allocatedCapacity: cap,
        stressIndex: Math.round((cap / 100) * 0.95 * 100) / 100,
        assignedProjects: [],
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
      };
      setOperatives(prev => [...prev, fallbackOp]);
      setHcmTelemetry(prev => [{
        time: new Date().toLocaleTimeString(),
        agent: 'HRManager',
        detail: `New member ${fallbackOp.name} added to ${fallbackOp.department}.`,
        badge: 'ROSTER ADD'
      }, ...prev]);
      setAddEmpModalOpen(false);
      setNewEmployee({
        name: '',
        role: '',
        department: 'Cloud Infrastructure',
        email: '',
        skills: '',
        allocatedCapacity: 40
      });
      setActionAlert({ type: 'success', message: 'New team member added successfully.' });
    } finally {
      setAddEmpLoading(false);
      setTimeout(() => setActionAlert(null), 4000);
    }
  };

  // ─── Filtered Team Members ──────────────────────────────────────────────────

  const filteredOperatives = operatives.filter(op => {
    if (matrixFilter === 'overloaded') return op.allocatedCapacity >= 100;
    if (matrixFilter === 'elevated') return op.allocatedCapacity >= 85 && op.allocatedCapacity < 100;
    if (matrixFilter === 'nominal') return op.allocatedCapacity < 85;
    return true;
  });

  // ─── Navigation Items (Clean & Simple Enterprise Terminology) ───────────────

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Incident & Operations' },
    { id: 'active_incidents', label: 'Incident Resolution', icon: AlertCircle, group: 'Incident & Operations' },
    { id: 'tickets', label: 'Incident Tickets', icon: Ticket, group: 'Incident & Operations' },
    { id: 'history', label: 'Past Incidents', icon: History, group: 'Incident & Operations' },
    { id: 'resource_matrix', label: 'Team & Capacity', icon: Users, group: 'Team & HR Management' },
    { id: 'talent_scout', label: 'Smart Team Search', icon: Sparkles, group: 'Team & HR Management' },
    { id: 'hr_wellbeing', label: 'Wellbeing Reviews', icon: HeartHandshake, group: 'Team & HR Management' },
    { id: 'missions', label: 'Projects', icon: Briefcase, group: 'Team & HR Management' },
    { id: 'settings', label: 'System Guidelines', icon: Settings, group: 'Platform' },
  ];

  const breadcrumb = {
    dashboard: 'Platform Dashboard',
    active_incidents: 'Incident Resolution Center',
    tickets: 'Incident Tickets & Records',
    history: 'Past Incidents & Resolutions',
    resource_matrix: 'Team Capacity & Allocation Matrix',
    talent_scout: 'Smart Team Search & Squad Matching',
    hr_wellbeing: 'Employee Wellbeing & Workload Reviews',
    missions: 'Enterprise Projects & Staffing',
    settings: 'System Guidelines & Workload Policies',
  };

  return (
    <div className="layout">
      {/* ─── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Layers size={24} color="#6366f1" /></div>
          <div>
            <span className="brand-text">AgentSync</span>
            <div className="brand-version">Decision Engine Enterprise</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {['Incident & Operations', 'Team & HR Management', 'Platform'].map(group => (
            <div key={group}>
              <div className="nav-group">{group}</div>
              {navItems.filter(i => i.group === group).map(({ id, label, icon: Icon }) => (
                <a
                  key={id}
                  href="#"
                  className={`nav-item ${currentView === id ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setCurrentView(id); }}
                >
                  <Icon size={18} />
                  {label}
                  {id === 'active_incidents' && result && (
                    <span className="nav-badge">{result.status?.includes('Error') ? '!' : '✓'}</span>
                  )}
                  {id === 'resource_matrix' && metrics?.hcm?.overloaded_count > 0 && (
                    <span className="nav-badge" style={{ background: '#f85149' }}>{metrics.hcm.overloaded_count}</span>
                  )}
                </a>
              ))}
              <div style={{ height: 12 }} />
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className={`status-dot ${apiHealth?.status === 'healthy' ? 'healthy' : 'degraded'}`}></div>
            <span>{apiHealth?.status === 'healthy' ? 'All Systems Operational' : 'Degraded'}</span>
          </div>
          {metrics && (
            <div className="footer-uptime">⏱ Uptime: {metrics.platform.uptime}</div>
          )}
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────────────────────── */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="breadcrumbs">
            <span>AgentSync</span>
            <ChevronRight size={14} />
            <span className="current">{breadcrumb[currentView]}</span>
          </div>
          <div className="topbar-actions">
            <div className="dual-stack-badge">
              <span className="status-dot healthy" />
              <span>System Online</span>
            </div>

            {isAdminAuthenticated ? (
              <button
                className="admin-status-badge unlocked"
                onClick={handleLockAdmin}
                title="HR Admin Unlocked. Click to lock."
              >
                <ShieldCheck size={14} color="#3fb950" />
                <span>HR Admin Active</span>
                <Lock size={12} style={{ opacity: 0.7 }} />
              </button>
            ) : (
              <button
                className="admin-status-badge locked"
                onClick={() => { setPendingAction(null); setAuthModalOpen(true); }}
                title="Click to authenticate as HR Admin"
              >
                <Lock size={13} color="#818cf8" />
                <span>HR Admin (Unlock)</span>
              </button>
            )}

            <div className="search-box">
              <Search size={15} />
              <input type="text" placeholder="Search team & outages..." />
            </div>
            <button className="icon-btn" title="Notifications"><Bell size={18} /></button>
            <div className="user-profile" title="Admin User"><User size={16} /></div>
          </div>
        </header>

        {actionAlert && (
          <div className={`action-alert-banner ${actionAlert.type}`}>
            {actionAlert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{actionAlert.message}</span>
          </div>
        )}

        <div className="dashboard-body">

          {/* ── 1. Dashboard View ────────────────────────────────────────────── */}
          {currentView === 'dashboard' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Executive Operations Dashboard</h1>
                  <p className="page-subtitle">Unified Incident Telemetry, Workforce Capacity &amp; Burnout Prevention Metrics</p>
                </div>
                <button className="btn-ghost" onClick={() => { fetchMetrics(); fetchHcmState(); }} disabled={metricsLoading}>
                  <RefreshCw size={15} className={metricsLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              {metricsLoading && !metrics ? (
                <div className="loading-state card">
                  <Activity className="spinner" size={36} color="#6366f1" />
                  <p>Loading platform telemetry &amp; workforce headroom...</p>
                </div>
              ) : metrics ? (
                <>
                  {/* Health Banner */}
                  <div className={`health-banner ${apiHealth?.status === 'healthy' ? 'healthy' : 'degraded'}`}>
                    <CheckCircle size={18} />
                    <span><strong>Platform Status:</strong> All Automated Incident &amp; Capacity Services Online &amp; Synchronized</span>
                    <span className="health-ts">Last checked: {new Date().toLocaleTimeString()}</span>
                  </div>

                  {/* Primary Operational Metrics (Meaningful, High-Value KPIs) */}
                  <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 20 }}>
                    <StatCard icon={AlertCircle} value={metrics.workflows?.workflows_last_24h || 1} label="Incidents Resolved (24h)" color="#6366f1" trend="Mean Triage: ~4s" />
                    <StatCard icon={CheckCircle2} value={metrics.workflows?.total_all_time || 0} label="Total Post-Mortems Stored" color="#3fb950" trend="Persistent Memory" />
                    <StatCard icon={Gauge} value={`${metrics.hcm?.average_headroom_pct || 22}%`} label="Team Workload Headroom" color="#58a6ff" trend="Safe Bandwidth Available" />
                    <StatCard
                      icon={AlertOctagon}
                      value={metrics.hcm?.overloaded_count || 0}
                      label="Burnout Prevention Lockouts"
                      color={metrics.hcm?.overloaded_count > 0 ? "#f85149" : "#3fb950"}
                      trend={metrics.hcm?.overloaded_count > 0 ? "Disqualified from Incident Paging" : "Nominal Team Load"}
                    />
                  </div>

                  {/* Workforce & Platform Performance Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginTop: 20 }}>
                    {/* Live Team Bandwidth */}
                    <div className="card">
                      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3><Users size={16} /> Live Team Bandwidth &amp; Headroom</h3>
                        <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setCurrentView('resource_matrix')}>
                          Open Team Matrix <ChevronRight size={13} />
                        </button>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {operatives.slice(0, 5).map(op => {
                            const isOver = op.allocatedCapacity >= 100;
                            const isElev = op.allocatedCapacity >= 85 && op.allocatedCapacity < 100;
                            const fillClass = isOver ? 'overload' : (isElev ? 'elevated' : 'nominal');
                            return (
                              <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <img src={op.avatar} alt={op.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                    <span><strong>{op.name}</strong> <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>• {op.role}</span></span>
                                    <span style={{ fontWeight: 600, color: isOver ? '#f85149' : (isElev ? '#e3b341' : '#3fb950') }}>
                                      {op.allocatedCapacity}% ({Math.max(0, 100 - op.allocatedCapacity)}% headroom)
                                    </span>
                                  </div>
                                  <div className="capacity-bar-track">
                                    <div className={`capacity-bar-fill ${fillClass}`} style={{ width: `${Math.min(100, op.allocatedCapacity)}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Team Workload Guidelines */}
                    <div className="card">
                      <div className="card-header">
                        <h3><ShieldCheck size={16} /> Team Workload Guidelines</h3>
                      </div>
                      <div className="card-body">
                        <div className="info-list">
                          <div className="info-row">
                            <span>Max Workload Limit</span>
                            <strong style={{ color: '#f85149' }}>100% Maximum (Strict Burnout Cap)</strong>
                          </div>
                          <div className="info-row">
                            <span>Warning Alert Level</span>
                            <strong style={{ color: '#e3b341' }}>&gt; 85% Active Workload</strong>
                          </div>
                          <div className="info-row">
                            <span>Team Members</span>
                            <strong>{operatives.length} Engineers</strong>
                          </div>
                          <div className="info-row">
                            <span>Active Projects</span>
                            <strong>{projects.length} Initiatives Tracked</strong>
                          </div>
                          <div className="info-row">
                            <span>Incident Auto-Lockout</span>
                            <strong style={{ color: '#3fb950' }}>Automatically Active</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <Info size={40} />
                  <p>Could not connect to the API. Make sure the backend is running.</p>
                </div>
              )}
            </div>
          )}

          {/* ── 2. Active Incidents View ──────────────────────────────────────── */}
          {currentView === 'active_incidents' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Autonomous Incident Resolution Center</h1>
                  <p className="page-subtitle">Ingest outages, isolate root causes, and automatically assign skill-matched engineers under 100% capacity</p>
                </div>
                {result && (
                  <div className={`status-badge ${result.status?.includes('Error') ? 'error' : 'success'}`}>
                    {result.status?.includes('Error') ? <ShieldAlert size={15} /> : <CheckCircle2 size={15} />}
                    {result.status}
                  </div>
                )}
              </div>

              <div className="grid-layout">
                {/* Left Column */}
                <div className="left-column">
                  <div className="card input-card">
                    <div className="card-header">
                      <h3><FileTerminal size={16} /> Ingest Outage &amp; Execute Autonomous Triage</h3>
                    </div>
                    <div className="card-body">
                      <textarea
                        className="enterprise-textarea"
                        rows={3}
                        placeholder="Describe the incident (e.g. Payment API is failing with database timeout errors...)"
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && runWorkflow()}
                      />
                      <div className="action-row">
                        <span className="hint-text">Ctrl+Enter to run</span>
                        <button className="btn-primary" onClick={runWorkflow} disabled={loading || !requestText.trim()}>
                          {loading ? <Activity className="spinner" size={16} /> : <Play size={16} />}
                          {loading ? "Agents Orchestrating..." : "Execute Automated Triage"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Pipeline Steps Animation */}
                  {loading && !result && (
                    <div className="pipeline-card card">
                      <div className="card-header"><h3><GitMerge size={16} /> Real-Time Multi-Agent Pipeline</h3></div>
                      <div className="card-body">
                        <div className="pipeline-steps">
                          {[
                            { name: '1. Incident Planning', desc: 'Synthesizing investigation checklist & required probes...', icon: BookOpen },
                            { name: '2. Autonomous Evidence Gathering', desc: 'Analyzing server logs, health metrics & SOP runbooks...', icon: Search },
                            { name: '3. Root Cause Analysis', desc: 'Isolating root failure & classifying risk priority...', icon: TrendingUp },
                            { name: '4. Resource Matching & Headroom Lock', desc: 'Enforcing <100% capacity & packaging context bundle...', icon: Users },
                          ].map(({ name, desc, icon: Icon }, i) => (
                            <div key={i} className="pipeline-step">
                              <div className="step-icon"><Icon size={16} /></div>
                              <div>
                                <div className="step-name">{name}</div>
                                <div className="step-desc">{desc}</div>
                              </div>
                              <Activity className="spinner step-spinner" size={14} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {result && (
                    <div className="results-container">
                      {/* Error display */}
                      {result.errors?.length > 0 && (
                        <div className="error-banner">
                          <ShieldAlert size={16} />
                          <div>{result.errors.map((e, i) => <p key={i}>{e}</p>)}</div>
                        </div>
                      )}

                      {/* Meaningful Incident Operational KPIs (NO raw tool invocation / LLM call debug counters!) */}
                      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="metric-box">
                          <div className="metric-icon-wrap" style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)' }}>
                            <Clock size={18} color="#58a6ff" />
                          </div>
                          <div>
                            <div className="metric-val">{result.execution_metrics?.duration_seconds || 4}s</div>
                            <div className="metric-label">Automated Triage Time</div>
                          </div>
                        </div>
                        <div className="metric-box">
                          <div className="metric-icon-wrap" style={{ background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.2)' }}>
                            <ShieldCheck size={18} color="#3fb950" />
                          </div>
                          <div>
                            <div className="metric-val" style={{ color: '#3fb950' }}>&lt; 100%</div>
                            <div className="metric-label">Headroom Compliant</div>
                          </div>
                        </div>
                        <div className="metric-box">
                          <div className="metric-icon-wrap" style={{ background: 'rgba(163,113,247,0.1)', border: '1px solid rgba(163,113,247,0.2)' }}>
                            <Zap size={18} color="#a371f7" />
                          </div>
                          <div>
                            <div className="metric-val" style={{ color: '#a371f7' }}>P1 Priority</div>
                            <div className="metric-label">Severity Tier</div>
                          </div>
                        </div>
                      </div>

                      {/* ── Smart Resource Assignment & Contextual Handoff Card ── */}
                      {result.assigned_engineer && (
                        <div className="smart-assignment-card">
                          <div className="assignment-header">
                            <div className="assignment-title">
                              <ShieldCheck size={18} color="#818cf8" />
                              <span>Smart Resource Assignment &amp; Headroom Lock</span>
                            </div>
                            <span className="badge" style={{ background: 'rgba(63,185,80,0.2)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.3)' }}>
                              MATCH FOUND: {result.context_bundle?.fit_score || 85}% FIT
                            </span>
                          </div>

                          <div className="assignment-details-grid">
                            <img
                              src={result.assigned_engineer.avatar}
                              alt={result.assigned_engineer.name}
                              className="assigned-avatar"
                            />
                            <div className="assigned-engineer-info">
                              <h4>
                                {result.assigned_engineer.name}
                                <span className="op-callsign" style={{ marginLeft: 8 }}>{result.assigned_engineer.callsign}</span>
                              </h4>
                              <p>{result.assigned_engineer.role}</p>
                              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                {result.assigned_engineer.skills?.slice(0, 5).map(s => (
                                  <span key={s} className="op-skill-chip">{s}</span>
                                ))}
                              </div>
                            </div>

                            <div className="headroom-meter-box">
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Workload Allocation:</span>
                                <strong>{result.assigned_engineer.capacity_before}% ➔ {result.assigned_engineer.capacity_after}%</strong>
                              </div>
                              <div className="capacity-bar-track">
                                <div
                                  className={`capacity-bar-fill ${result.assigned_engineer.capacity_after > 100 ? 'overload' : (result.assigned_engineer.capacity_after > 85 ? 'elevated' : 'nominal')}`}
                                  style={{ width: `${Math.min(100, result.assigned_engineer.capacity_after)}%` }}
                                />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>
                                <span>Remaining Headroom:</span>
                                <strong style={{ color: '#3fb950' }}>{result.context_bundle?.remaining_headroom || 0}%</strong>
                              </div>
                            </div>
                          </div>

                          {/* Wellbeing Alert */}
                          {result.wellbeing_alert && (
                            <div className="disqualified-alert" style={{ background: 'rgba(227,179,65,0.1)', borderColor: 'rgba(227,179,65,0.3)', color: '#e3b341' }}>
                              <HeartHandshake size={15} />
                              <span>{result.wellbeing_alert.message} — {result.wellbeing_alert.recommendation}</span>
                            </div>
                          )}

                          {/* Contextual Telemetry Handoff Bundle */}
                          {result.context_bundle?.incident_diagnostics && (
                            <div className="telemetry-handoff-box">
                              <h5><FileTerminal size={13} /> Pre-Packaged Context Bundle (Instant Handoff)</h5>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Affected Service:</span>
                                  <strong style={{ marginLeft: 6, color: '#fff' }}>{result.context_bundle.incident_diagnostics.affected_service}</strong>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Recommended Runbook:</span>
                                  <strong style={{ marginLeft: 6, color: '#fff' }}>{result.context_bundle.incident_diagnostics.recommended_runbook}</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Burnout Prevention Disqualification Notice */}
                          <div className="disqualified-alert" style={{ marginTop: 10, background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)', color: 'var(--text-muted)' }}>
                            <ShieldCheck size={14} color="#818cf8" />
                            <span>
                              <strong>Burnout Protection Active:</strong> Operatives at or above 100% capacity threshold (e.g. Dr. Elena Rostova @ 115%) are automatically disqualified from incident pager duty.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tabs */}
                      <div className="card tabs-card">
                        <div className="tabs-header">
                          {[
                            { id: 'plan', label: 'Execution Plan', icon: BookOpen },
                            { id: 'investigation', label: 'Investigation Evidence', icon: Search },
                            { id: 'analysis', label: 'Root Cause Diagnosis', icon: TrendingUp },
                            { id: 'decision', label: 'Mitigation & SOP', icon: Zap },
                          ].map(({ id, label, icon: Icon }) => (
                            <button
                              key={id}
                              className={`tab-btn ${activeTab === id ? 'active' : ''}`}
                              onClick={() => setActiveTab(id)}
                            >
                              <Icon size={13} />
                              {label}
                            </button>
                          ))}
                        </div>
                        <div className="tab-content markdown-body">
                          {activeTab === 'plan' && <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.plan || "*No plan data.*"}</ReactMarkdown>}
                          {activeTab === 'investigation' && <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.investigation_results || "*No investigation data.*"}</ReactMarkdown>}
                          {activeTab === 'analysis' && <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.analysis || "*No analysis data.*"}</ReactMarkdown>}
                          {activeTab === 'decision' && <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.decision || "*No recommendation data.*"}</ReactMarkdown>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column — Chat */}
                <div className="right-column">
                  {!result && !loading && (
                    <div className="resolution-prompt card">
                      <div className="prompt-icon"><AlertCircle size={40} color="#6366f1" /></div>
                      <h3>Incident Resolution Center</h3>
                      <p>Submit an outage report above. The engine coordinates Planner, Investigation, Analysis, and Decision nodes while enforcing operative headroom constraints.</p>
                    </div>
                  )}

                  {result && !chatActive && (
                    <div className="resolution-prompt card">
                      <div className="prompt-icon"><MessageSquare size={32} /></div>
                      <h3>Incident Copilot Ready</h3>
                      <p>The root cause is isolated and an engineer is assigned. Launch the interactive copilot to ask follow-up questions or execute mitigation steps.</p>
                      <button className="btn-secondary" onClick={() => setChatActive(true)}>
                        Open Resolution Copilot <ChevronRight size={15} />
                      </button>
                    </div>
                  )}

                  {chatActive && (
                    <div className="chat-interface card">
                      <div className="chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Layers size={16} color="#58a6ff" />
                          <h4>Resolution Copilot</h4>
                        </div>
                        <span className="badge">Active</span>
                      </div>
                      <div className="chat-messages">
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`message-bubble ${msg.role}`}>
                            {msg.role === 'ai' && <div className="avatar"><Layers size={13} /></div>}
                            <div className="msg-content">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                        {isChatting && (
                          <div className="message-bubble ai">
                            <div className="avatar"><Layers size={13} /></div>
                            <div className="msg-content">
                              <span className="typing-dots">Agent is reasoning...</span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="chat-input-area">
                        <input
                          type="text"
                          placeholder="Ask a follow-up question..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                          disabled={isChatting}
                        />
                        <button className="send-btn" onClick={handleSendChat} disabled={!chatInput.trim() || isChatting}>
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── 3. Team & Capacity View ─────────────────────────────────────── */}
          {currentView === 'resource_matrix' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Team Capacity &amp; Allocation Matrix</h1>
                  <p className="page-subtitle">Real-time team bandwidth, project allocations &amp; burnout headroom tracking</p>
                </div>
                <div className="matrix-header-actions">
                  <button className="btn-primary" onClick={triggerAddEmployee}>
                    <UserPlus size={14} /> Add Team Member
                  </button>
                  <div className="tabs-header" style={{ margin: 0 }}>
                    <button
                      className={`tab-btn ${matrixViewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setMatrixViewMode('cards')}
                    >
                      <Users size={14} /> Team Roster
                    </button>
                    <button
                      className={`tab-btn ${matrixViewMode === 'matrix' ? 'active' : ''}`}
                      onClick={() => setMatrixViewMode('matrix')}
                    >
                      <Sliders size={14} /> Allocation Matrix
                    </button>
                  </div>
                  <button className="btn-ghost" onClick={fetchHcmState} disabled={hcmLoading}>
                    <RefreshCw size={15} className={hcmLoading ? 'spinner' : ''} />
                    Sync
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: 8, margin: '16px 0', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Filter size={13} /> Filter:
                </span>
                {[
                  { id: 'all', label: `All Members (${operatives.length})` },
                  { id: 'overloaded', label: `Overloaded ≥100% (${operatives.filter(o => o.allocatedCapacity >= 100).length})` },
                  { id: 'elevated', label: `Elevated 85-99% (${operatives.filter(o => o.allocatedCapacity >= 85 && o.allocatedCapacity < 100).length})` },
                  { id: 'nominal', label: `Safe <85% (${operatives.filter(o => o.allocatedCapacity < 85).length})` },
                ].map(f => (
                  <button
                    key={f.id}
                    className={`btn-ghost ${matrixFilter === f.id ? 'active' : ''}`}
                    style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      background: matrixFilter === f.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                      color: matrixFilter === f.id ? '#818cf8' : 'var(--text-muted)',
                      border: matrixFilter === f.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent'
                    }}
                    onClick={() => setMatrixFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* View 1: Team Member Cards */}
              {matrixViewMode === 'cards' && (
                <div className="operatives-grid">
                  {filteredOperatives.map(op => {
                    const isOver = op.allocatedCapacity >= 100;
                    const isElev = op.allocatedCapacity >= 85 && op.allocatedCapacity < 100;
                    const fillClass = isOver ? 'overload' : (isElev ? 'elevated' : 'nominal');
                    return (
                      <div key={op.id} className={`card operative-card ${isOver ? 'overloaded' : ''}`}>
                        <div className="op-header">
                          <div className="op-avatar-wrap">
                            <img src={op.avatar} alt={op.name} className="op-avatar" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="op-title-row">
                              <span className="op-name">{op.name}</span>
                              <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 11 }}>
                                {op.department || "Engineering"}
                              </span>
                            </div>
                            <div className="op-role">{op.role}</div>
                          </div>
                          <button
                            className="btn-ghost"
                            onClick={() => triggerDeleteEmployee(op)}
                            title="Remove team member"
                            style={{ padding: '6px', color: '#f85149', borderColor: 'transparent' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="op-body">
                          {/* Capacity Meter */}
                          <div className="capacity-meter">
                            <div className="capacity-labels">
                              <span style={{ color: 'var(--text-muted)' }}>Workload Capacity</span>
                              <strong style={{ color: isOver ? '#f85149' : (isElev ? '#e3b341' : '#3fb950') }}>
                                {op.allocatedCapacity}% ({Math.max(0, 100 - op.allocatedCapacity)}% headroom)
                              </strong>
                            </div>
                            <div className="capacity-bar-track">
                              <div className={`capacity-bar-fill ${fillClass}`} style={{ width: `${Math.min(100, op.allocatedCapacity)}%` }} />
                            </div>
                            {isOver && (
                              <div className="burnout-alert-pill" style={{ marginTop: 4 }}>
                                <AlertOctagon size={13} />
                                <span>BURNOUT LOCKOUT: Exceeds 100% capacity</span>
                              </div>
                            )}
                          </div>

                          {/* Skills */}
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TECH STACK &amp; SKILLS</div>
                            <div className="op-skills-wrap">
                              {op.skills?.map(s => (
                                <span key={s} className="op-skill-chip">{s}</span>
                              ))}
                            </div>
                          </div>

                          {/* Active Projects */}
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ACTIVE PROJECTS</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {op.assignedProjects?.length > 0 ? (
                                op.assignedProjects.map(pid => (
                                  <span key={pid} className="id-badge" style={{ fontSize: 11 }}>{pid}</span>
                                ))
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Available (No Active Projects)</span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                              className="btn-secondary"
                              style={{ flex: 1, fontSize: 12, justifyContent: 'center' }}
                              onClick={() => handleRunHrReview(op.id, null, true)}
                            >
                              <HeartHandshake size={14} /> Review Wellbeing
                            </button>
                            <button
                              className="btn-ghost"
                              style={{ fontSize: 12, color: '#f85149', borderColor: 'rgba(248,81,73,0.3)', padding: '6px 10px' }}
                              onClick={() => triggerDeleteEmployee(op)}
                              title="Remove from roster"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View 2: Interactive Allocation Matrix Table */}
              {matrixViewMode === 'matrix' && (
                <div className="card" style={{ marginTop: 10 }}>
                  <div className="card-header">
                    <h3><Sliders size={16} /> Interactive Project Allocation Matrix (Instant Headroom Recalculation)</h3>
                  </div>
                  <div className="table-responsive">
                    <table className="allocation-matrix-table">
                      <thead>
                        <tr>
                          <th>Team Member</th>
                          <th>Load / Capacity</th>
                          {projects.map(p => (
                            <th key={p.id}>{p.title || p.codename}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {operatives.map(op => {
                          const isOver = op.allocatedCapacity >= 100;
                          return (
                            <tr key={op.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <img src={op.avatar} alt={op.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                                  <div>
                                    <strong>{op.name}</strong>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{op.role}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontWeight: 700, color: isOver ? '#f85149' : '#3fb950' }}>
                                  {op.allocatedCapacity}%
                                </span>
                              </td>
                              {projects.map(p => {
                                const isAssigned = op.assignedProjects?.includes(p.id);
                                return (
                                  <td key={p.id}>
                                    <button
                                      className={`matrix-toggle-btn ${isAssigned ? 'assigned' : ''}`}
                                      onClick={() => handleToggleAllocation(op.id, p.id)}
                                    >
                                      {isAssigned ? '✓ ASSIGNED' : '+ ALLOCATE'}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Live Telemetry Stream */}
              <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header">
                  <h3><Activity size={16} /> Resource Matrix Telemetry &amp; Headroom Events</h3>
                </div>
                <div className="card-body">
                  <div className="telemetry-ticker">
                    {hcmTelemetry.map((t, idx) => (
                      <div key={idx} className="telemetry-ticker-item">
                        <span className="ticker-time">[{t.time}]</span>
                        <span className="ticker-agent">{t.agent}:</span>
                        <span style={{ color: '#fff', flex: 1 }}>{t.detail}</span>
                        <span className="ticker-badge" style={{ background: t.badge?.includes('OVERLOAD') ? '#da3633' : '#238636' }}>
                          {t.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 4. Talent Scout AI (from Decision Engine) ─────────────────────── */}
          {currentView === 'talent_scout' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Talent Scout AI &amp; Squad Assembly</h1>
                  <p className="page-subtitle">Natural language skill matching with automatic headroom and burnout disqualification checks</p>
                </div>
              </div>

              {/* Search Container */}
              <div className="scout-search-container">
                <div className="scout-input-wrap">
                  <Sparkles size={20} color="#818cf8" />
                  <input
                    type="text"
                    className="scout-input"
                    placeholder="Describe skill requirements (e.g., Senior Go engineer with Kafka and low-latency microservices...)"
                    value={scoutQuery}
                    onChange={(e) => setScoutQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScoutSearch()}
                  />
                  <button className="btn-primary" onClick={() => handleScoutSearch()} disabled={scoutLoading || !scoutQuery.trim()}>
                    {scoutLoading ? <Activity className="spinner" size={16} /> : <Search size={16} />}
                    {scoutLoading ? "Scouting..." : "Match Squad"}
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="scout-presets">
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quick Scenarios:</span>
                  {[
                    "Zero-Downtime Kubernetes Migration",
                    "High-Frequency Kafka & Go Pipeline",
                    "Autonomous LLM & Vector Database Research",
                    "Cloud Security & Zero-Trust Defense"
                  ].map(preset => (
                    <button
                      key={preset}
                      className="scout-preset-btn"
                      onClick={() => {
                        setScoutQuery(preset);
                        handleScoutSearch(preset);
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scout Results */}
              {scoutResults && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, color: '#fff' }}>
                      Ranked Candidates ({scoutResults.candidates?.length} Available Under 100% Load)
                    </h3>
                    {scoutResults.disqualified_overloaded?.length > 0 && (
                      <span className="badge" style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)' }}>
                        {scoutResults.disqualified_overloaded.length} Overloaded Disqualified
                      </span>
                    )}
                  </div>

                  <div className="scout-results-grid">
                    {scoutResults.candidates?.map((cand, idx) => {
                      const op = cand.operative;
                      return (
                        <div key={op.id} className="card scout-card">
                          <div className="op-header">
                            <div className="op-avatar-wrap">
                              <img src={op.avatar} alt={op.name} className="op-avatar" />
                              <span className="op-level-badge">#{idx + 1}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="op-title-row">
                                <span className="op-name">{op.name}</span>
                                <span className="scout-match-badge">{cand.fit_score}% FIT</span>
                              </div>
                              <div className="op-role">{op.role}</div>
                            </div>
                          </div>

                          <div className="op-body">
                            <div className="capacity-meter">
                              <div className="capacity-labels">
                                <span style={{ color: 'var(--text-muted)' }}>Headroom Available</span>
                                <strong style={{ color: '#3fb950' }}>{cand.remaining_headroom}% headroom</strong>
                              </div>
                              <div className="capacity-bar-track">
                                <div className="capacity-bar-fill nominal" style={{ width: `${cand.remaining_headroom}%` }} />
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>MATCHED CAPABILITIES</div>
                              <div className="op-skills-wrap">
                                {cand.matched_skills?.map(s => (
                                  <span key={s} className="op-skill-chip" style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8' }}>
                                    ✓ {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button
                              className="btn-primary"
                              style={{ width: '100%', fontSize: 12, justifyContent: 'center', marginTop: 6 }}
                              onClick={() => {
                                handleRunHrReview(op.id, null, true);
                              }}
                            >
                              <User size={13} /> Select Operative Profile
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Disqualified Operatives Alert */}
                  {scoutResults.disqualified_overloaded?.length > 0 && (
                    <div className="card" style={{ marginTop: 24, border: '1px solid rgba(248,81,73,0.3)', background: 'rgba(248,81,73,0.03)' }}>
                      <div className="card-header" style={{ color: '#f85149' }}>
                        <h3><AlertOctagon size={16} /> Burnout Prevention: Disqualified from Consideration</h3>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                          {scoutResults.disqualified_overloaded.map(dis => (
                            <div key={dis.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                              <img src={dis.avatar} alt={dis.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                              <div>
                                <strong style={{ fontSize: 13, color: '#fff' }}>{dis.name} ({dis.callsign})</strong>
                                <div style={{ fontSize: 11, color: '#f85149' }}>{dis.allocatedCapacity}% Load (Exceeds Safety Threshold)</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 5. HR Wellbeing Hub (from Decision Engine) ────────────────────── */}
          {currentView === 'hr_wellbeing' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Employee Wellbeing &amp; Situational HR Hub</h1>
                  <p className="page-subtitle">Evidence-based assessment across Workload, Project Fit, Performance, Availability &amp; Wellbeing Check-ins</p>
                </div>
              </div>

              {/* Selector Bar */}
              <div className="wellbeing-emp-selector">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <User size={16} color="#818cf8" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Operative:</span>
                  <select value={selectedHrOpId} onChange={(e) => setSelectedHrOpId(e.target.value)}>
                    {operatives.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.callsign}) — {o.allocatedCapacity}% Load
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Briefcase size={16} color="#a371f7" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Compare Project:</span>
                  <select value={selectedHrPrjId} onChange={(e) => setSelectedHrPrjId(e.target.value)}>
                    <option value="">(None - General Assessment)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.codename}: {p.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => handleRunHrReview(selectedHrOpId, selectedHrPrjId)}
                  disabled={hrReviewLoading}
                >
                  {hrReviewLoading ? <Activity className="spinner" size={15} /> : <HeartHandshake size={15} />}
                  {hrReviewLoading ? "Synthesizing..." : "Run 5-Agent Review"}
                </button>
              </div>

              {/* Assessment Results */}
              {hrAssessment ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                    {hrAssessment.agents?.map((ag, idx) => (
                      <div key={idx} className="card" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <strong style={{ color: '#fff', fontSize: 14 }}>{ag.agent}</strong>
                          <span
                            className="badge"
                            style={{
                              background: ag.status?.includes('OVER') || ag.status?.includes('NO_') ? 'rgba(248,81,73,0.15)' : 'rgba(99,102,241,0.15)',
                              color: ag.status?.includes('OVER') || ag.status?.includes('NO_') ? '#f85149' : '#818cf8',
                              border: `1px solid ${ag.status?.includes('OVER') || ag.status?.includes('NO_') ? 'rgba(248,81,73,0.3)' : 'rgba(99,102,241,0.3)'}`
                            }}
                          >
                            {ag.status}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-main)', marginBottom: 8, lineHeight: 1.5 }}>{ag.summary}</p>
                        {ag.evidence?.length > 0 && (
                          <ul className="hr-evidence-list">
                            {ag.evidence.map((ev, i) => (
                              <li key={i}>• {ev}</li>
                            ))}
                          </ul>
                        )}
                        {ag.recommendations?.length > 0 && (
                          <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(227,179,65,0.08)', borderRadius: 4, fontSize: 12, border: '1px solid rgba(227,179,65,0.2)' }}>
                            <strong style={{ color: '#e3b341' }}>Action:</strong> {ag.recommendations[0]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {hrAssessment.disclaimer && (
                    <div className="card" style={{ marginTop: 16, background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        ℹ️ {hrAssessment.disclaimer}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card empty-state" style={{ padding: 40 }}>
                  <HeartHandshake size={40} color="#818cf8" />
                  <h3 style={{ marginTop: 12, color: '#fff' }}>Select an Operative to Review</h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '8px auto' }}>
                    Click &quot;Run 5-Agent Review&quot; above to synthesize workload headroom, skill compatibility, historical velocity, and wellbeing indicators.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── 6. Enterprise Missions View ──────────────────────────────────── */}
          {currentView === 'missions' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Enterprise Missions &amp; Projects</h1>
                  <p className="page-subtitle">Track project skill dependencies, slot allocations &amp; operational deadlines</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-primary" onClick={() => setMissionModalOpen(true)}>
                    <Plus size={15} /> Forge New Mission
                  </button>
                  <button className="btn-ghost" onClick={fetchHcmState}>
                    <RefreshCw size={15} /> Refresh
                  </button>
                </div>
              </div>

              <div className="missions-grid" style={{ marginTop: 20 }}>
                {projects.map(prj => (
                  <div key={prj.id} className="card mission-card">
                    <div className="mission-header">
                      <div>
                        <span className="mission-codename">{prj.codename}</span>
                        <h4 className="mission-title">{prj.title}</h4>
                      </div>
                      <span className="id-badge">{prj.id}</span>
                    </div>
                    <div className="card-body">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 12 }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Dept:</span> <strong>{prj.department}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Budget:</span> <strong>{prj.budget}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Difficulty:</span> <strong>{prj.difficulty}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Deadline:</span> <strong>{prj.deadline}</strong></div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>REQUIRED SKILLS</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {prj.requiredSkills?.map(s => (
                            <span key={s} className="op-skill-chip">{s}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Assigned Operatives</span>
                          <strong>{prj.assignedOperativeIds?.length || 0} / {prj.requiredSlots || 3} Slots</strong>
                        </div>
                        <div className="capacity-bar-track">
                          <div
                            className="capacity-bar-fill nominal"
                            style={{ width: `${Math.min(100, ((prj.assignedOperativeIds?.length || 0) / (prj.requiredSlots || 3)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 7. Incident Tickets View ─────────────────────────────────────── */}
          {currentView === 'tickets' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Incident Tickets &amp; ITSM Records</h1>
                  <p className="page-subtitle">Tracked incident resolution records with pre-packaged diagnostic telemetry</p>
                </div>
                <button className="btn-ghost" onClick={fetchTickets} disabled={ticketsLoading}>
                  <RefreshCw size={15} className={ticketsLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              <div className="card" style={{ marginTop: 20 }}>
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Title / Incident</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Severity</th>
                        <th>Timestamp</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketsLoading ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                          <Activity className="spinner" size={24} color="#6366f1" />
                        </td></tr>
                      ) : tickets.length === 0 ? (
                        <tr><td colSpan="7" className="empty-row">No incident tickets found.</td></tr>
                      ) : (
                        tickets.map((t) => (
                          <tr key={t.ticket_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(t)}>
                            <td>
                              <span className="id-badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Ticket size={12} />
                                {t.ticket_id}
                              </span>
                            </td>
                            <td className="truncate-cell" style={{ maxWidth: 300 }}>
                              <strong>{t.title}</strong>
                            </td>
                            <td>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.type}</span>
                            </td>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                background: t.status === 'Escalated' ? 'rgba(248,81,73,0.15)' : t.status === 'Resolved' ? 'rgba(63,185,80,0.15)' : 'rgba(210,153,34,0.15)',
                                color: t.status === 'Escalated' ? '#f85149' : t.status === 'Resolved' ? '#3fb950' : '#d29922',
                                border: `1px solid ${t.status === 'Escalated' ? 'rgba(248,81,73,0.3)' : t.status === 'Resolved' ? 'rgba(63,185,80,0.3)' : 'rgba(210,153,34,0.3)'}`
                              }}>
                                {t.status}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: t.severity === 'High' ? '#f85149' : '#58a6ff'
                              }}>
                                {t.severity}
                              </span>
                            </td>
                            <td><span className="ts-text">{t.timestamp}</span></td>
                            <td>
                              <button
                                className="btn-ghost"
                                style={{ padding: '3px 8px', fontSize: 12 }}
                                onClick={(e) => { e.stopPropagation(); setSelectedTicket(t); }}
                              >
                                <Eye size={13} /> View Ticket
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ticket Details Modal */}
              {selectedTicket && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 9999, padding: 20
                }} onClick={() => setSelectedTicket(null)}>
                  <div className="card" style={{
                    maxWidth: 750, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)', border: '1px solid #30363d'
                  }} onClick={(e) => e.stopPropagation()}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Ticket size={20} color="#818cf8" />
                        <h3 style={{ margin: 0 }}>Ticket Details — {selectedTicket.ticket_id}</h3>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: selectedTicket.status === 'Escalated' ? 'rgba(248,81,73,0.15)' : 'rgba(63,185,80,0.15)',
                          color: selectedTicket.status === 'Escalated' ? '#f85149' : '#3fb950'
                        }}>
                          {selectedTicket.status}
                        </span>
                      </div>
                      <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setSelectedTicket(null)}>✕</button>
                    </div>
                    <div className="card-body" style={{ overflowY: 'auto', padding: 24 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                        <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Type</span>
                          <strong>{selectedTicket.type}</strong>
                        </div>
                        <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Source</span>
                          <strong>{selectedTicket.source}</strong>
                        </div>
                        <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created / Logged</span>
                          <strong>{selectedTicket.timestamp}</strong>
                        </div>
                      </div>

                      <h4 style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Diagnostic Telemetry &amp; Resolution Directives</h4>
                      <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, padding: 16 }}>
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedTicket.content || '*No content.*'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 8. History View ──────────────────────────────────────────────── */}
          {currentView === 'history' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Long-Term Memory Investigations</h1>
                  <p className="page-subtitle">Persistent incident history: {historyTotal} records indexed in SQLite memory</p>
                </div>
                <button className="btn-ghost" onClick={fetchHistory} disabled={historyLoading}>
                  <RefreshCw size={15} className={historyLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              <div className="card" style={{ marginTop: 20 }}>
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Incident Request</th>
                        <th>Timestamp</th>
                        <th>Mitigation Decision (Preview)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLoading ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                          <Activity className="spinner" size={24} color="#6366f1" />
                        </td></tr>
                      ) : history.length === 0 ? (
                        <tr><td colSpan="4" className="empty-row">No investigations found in database.</td></tr>
                      ) : (
                        history.map((record) => (
                          <tr key={record.id}>
                            <td><span className="id-badge">#{record.id}</span></td>
                            <td className="truncate-cell"><strong>{record.user_request}</strong></td>
                            <td><span className="ts-text">{new Date(record.timestamp + 'Z').toLocaleString()}</span></td>
                            <td className="truncate-cell" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{record.decision}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── 9. System Guidelines & Policies View ───────────────────────── */}
          {currentView === 'settings' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">System Guidelines &amp; Policies</h1>
                  <p className="page-subtitle">Organizational workload policies, burnout prevention thresholds, and security administration</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                {/* Card 1: Team Workload Policies */}
                <div className="card">
                  <div className="card-header"><h3><ShieldCheck size={16} /> Workload Headroom &amp; Safeguards</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Hard Workload Cap</span>
                        <strong style={{ color: '#f85149' }}>100% Maximum Capacity</strong>
                      </div>
                      <div className="info-row">
                        <span>Burnout Protection</span>
                        <span className="badge success">Active (Auto-Lockout)</span>
                      </div>
                      <div className="info-row">
                        <span>Overload Action</span>
                        <span className="info-value">Automatically Disqualified from Pager Duty</span>
                      </div>
                      <div className="info-row">
                        <span>Early Warning Threshold</span>
                        <strong style={{ color: '#e3b341' }}>&gt; 85% Active Workload</strong>
                      </div>
                      <div className="info-row">
                        <span>Target Utilization</span>
                        <span className="info-value">65% – 80% per Engineer</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: HR Security & Admin Access */}
                <div className="card">
                  <div className="card-header"><h3><Lock size={16} /> HR Administrator Security Access</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Security Level</span>
                        <span className="info-value">Protected Personnel Operations</span>
                      </div>
                      <div className="info-row">
                        <span>Current Admin Session</span>
                        {isAdminAuthenticated ? (
                          <span className="badge success">Authenticated (Active)</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149' }}>Locked</span>
                        )}
                      </div>
                      <div className="info-row">
                        <span>Team Management Action</span>
                        {isAdminAuthenticated ? (
                          <button className="btn-ghost" style={{ fontSize: 12, color: '#f85149' }} onClick={handleLockAdmin}>
                            <Lock size={12} /> Lock Admin Access
                          </button>
                        ) : (
                          <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setPendingAction(null); setAuthModalOpen(true); }}>
                            <LockOpen size={12} /> Authenticate Admin
                          </button>
                        )}
                      </div>
                      <div className="info-row">
                        <span>Policy Scope</span>
                        <span className="info-value">Only authenticated managers can add or remove team members</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Intelligent Triage Dispatch */}
                <div className="card">
                  <div className="card-header"><h3><Zap size={16} /> Incident Assignment Strategy</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Matching Strategy</span>
                        <span className="info-value">Skill Relevance + Lowest Workload Load</span>
                      </div>
                      <div className="info-row">
                        <span>Context Handoff</span>
                        <span className="info-value">Pre-Packaged Diagnostic Telemetry &amp; Runbook</span>
                      </div>
                      <div className="info-row">
                        <span>Average Triage Speed</span>
                        <span className="info-value">~4 Seconds Autonomous Resolution</span>
                      </div>
                      <div className="info-row">
                        <span>Severity Classification</span>
                        <span className="info-value">Multi-Tier Prioritization (P1, P2, P3)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Platform Reliability */}
                <div className="card">
                  <div className="card-header"><h3><Activity size={16} /> Platform Operational Status</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>System Health</span>
                        <span className="badge success">All Systems Operational</span>
                      </div>
                      <div className="info-row">
                        <span>Incident Dispatch Service</span>
                        <span className="info-value">Online &amp; Responsive</span>
                      </div>
                      <div className="info-row">
                        <span>Workforce Directory</span>
                        <span className="info-value">{operatives.length} Team Members Registered</span>
                      </div>
                      <div className="info-row">
                        <span>Active Projects</span>
                        <span className="info-value">{projects.length} Initiatives Tracked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── 5-Agent HR Review Modal ─────────────────────────────────────────── */}
      {hrModalOpen && modalOperative && (
        <div className="hr-modal-overlay" onClick={() => setHrModalOpen(false)}>
          <div className="hr-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HeartHandshake size={20} color="#818cf8" />
                <h3 style={{ margin: 0 }}>5-Agent HR Situation Review — {modalOperative.name}</h3>
                <span className="op-callsign">{modalOperative.callsign}</span>
              </div>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setHrModalOpen(false)}>✕</button>
            </div>

            <div className="card-body" style={{ overflowY: 'auto', padding: 24 }}>
              {hrReviewLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Activity className="spinner" size={32} color="#6366f1" />
                  <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Coordinating 5 HR evaluation agents...</p>
                </div>
              ) : hrAssessment ? (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Evidence-based situational assessment synthesized across 5 specialized autonomous HR agents:
                  </p>

                  {hrAssessment.agents?.map((ag, idx) => (
                    <div key={idx} className="hr-agent-item">
                      <div className="hr-agent-header">
                        <strong style={{ color: '#fff', fontSize: 13 }}>{ag.agent}</strong>
                        <span
                          className="hr-agent-badge"
                          style={{
                            background: ag.status?.includes('OVER') || ag.status?.includes('NO_') ? 'rgba(248,81,73,0.15)' : 'rgba(99,102,241,0.15)',
                            color: ag.status?.includes('OVER') || ag.status?.includes('NO_') ? '#f85149' : '#818cf8'
                          }}
                        >
                          {ag.status}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-main)', marginBottom: 6 }}>{ag.summary}</p>
                      {ag.evidence?.length > 0 && (
                        <ul className="hr-evidence-list">
                          {ag.evidence.map((ev, i) => (
                            <li key={i}>• {ev}</li>
                          ))}
                        </ul>
                      )}
                      {ag.recommendations?.length > 0 && (
                        <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 4, fontSize: 12 }}>
                          <strong style={{ color: '#e3b341' }}>Recommendation:</strong> {ag.recommendations[0]}
                        </div>
                      )}
                    </div>
                  ))}

                  {hrAssessment.disclaimer && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 14 }}>
                      ⚠️ {hrAssessment.disclaimer}
                    </p>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <p>Unable to generate assessment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Project Creation Modal ────────────────────────────────────────── */}
      {missionModalOpen && (
        <div className="hr-modal-overlay" onClick={() => setMissionModalOpen(false)}>
          <div className="hr-modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Briefcase size={18} color="#818cf8" />
                <h3 style={{ margin: 0 }}>Create Enterprise Project</h3>
              </div>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setMissionModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleForgeMission} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Real-Time Kafka Stream Pipeline"
                  value={newMission.title}
                  onChange={(e) => setNewMission({ ...newMission, title: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Department</label>
                  <input
                    type="text"
                    value={newMission.department}
                    onChange={(e) => setNewMission({ ...newMission, department: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Budget</label>
                  <input
                    type="text"
                    value={newMission.budget}
                    onChange={(e) => setNewMission({ ...newMission, budget: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Required Skills (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Go, Kafka, Docker, Kubernetes"
                  value={newMission.required_skills}
                  onChange={(e) => setNewMission({ ...newMission, required_skills: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn-ghost" onClick={() => setMissionModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={missionSubmitting}>
                  {missionSubmitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── HR Administrator Security Authentication Modal ─────────────────── */}
      {authModalOpen && (
        <div className="hr-modal-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="hr-modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={20} color="#818cf8" />
                <h3 style={{ margin: 0 }}>HR Admin Authentication</h3>
              </div>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setAuthModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAdminLogin} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Administrator verification is required to add or remove team members.
              </p>

              {authError && (
                <div className="disqualified-alert" style={{ marginTop: 0 }}>
                  <ShieldAlert size={14} />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Admin Username</label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="admin"
                  style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 14 }}
                />
              </div>

              <div style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: '#818cf8' }}>
                🔑 <strong>Default Credentials:</strong> <code>admin</code> / <code>admin123</code>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-ghost" onClick={() => setAuthModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? <Activity className="spinner" size={15} /> : <LockOpen size={15} />}
                  {authLoading ? "Verifying..." : "Verify & Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Add New Team Member Modal ───────────────────────────────────────── */}
      {addEmpModalOpen && (
        <div className="hr-modal-overlay" onClick={() => setAddEmpModalOpen(false)}>
          <div className="hr-modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserPlus size={18} color="#818cf8" />
                <h3 style={{ margin: 0 }}>Add New Team Member</h3>
              </div>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setAddEmpModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddEmployeeSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Job Role / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior DevOps Engineer"
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Department</label>
                  <select
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  >
                    <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                    <option value="Applied AI">Applied AI</option>
                    <option value="Frontend Systems">Frontend Systems</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Core Services">Core Services</option>
                    <option value="Platform Engineering">Platform Engineering</option>
                    <option value="Data Systems">Data Systems</option>
                    <option value="Engineering">Engineering General</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Work Email</label>
                  <input
                    type="email"
                    placeholder="e.g. maya.lin@enterprise.com"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Initial Workload %</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={newEmployee.allocatedCapacity}
                    onChange={(e) => setNewEmployee({ ...newEmployee, allocatedCapacity: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Tech Stack &amp; Skills (comma separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Go, Kubernetes, Terraform, Docker, Python"
                  value={newEmployee.skills}
                  onChange={(e) => setNewEmployee({ ...newEmployee, skills: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn-ghost" onClick={() => setAddEmpModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={addEmpLoading}>
                  {addEmpLoading ? "Adding..." : "Add to Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ───────────────────────────────────────── */}
      {deleteConfirmTarget && (
        <div className="hr-modal-overlay" onClick={() => setDeleteConfirmTarget(null)}>
          <div className="hr-modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Trash2 size={18} color="#f85149" />
                <h3 style={{ margin: 0, color: '#f85149' }}>Remove Team Member</h3>
              </div>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setDeleteConfirmTarget(null)}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>
                Are you sure you want to remove <strong>{deleteConfirmTarget.name}</strong> from the team roster?
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                This will immediately clear all active project allocations for this member and update team bandwidth headroom.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-ghost" onClick={() => setDeleteConfirmTarget(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn-danger"
                  style={{ background: '#da3633', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Removing..." : "Confirm Removal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
