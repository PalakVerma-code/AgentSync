import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, Play, Server, Clock,
  Layers, Search, Bell, LayoutDashboard, AlertCircle,
  Settings, History, MessageSquare, Send, ChevronRight, CheckCircle2,
  FileTerminal, ShieldAlert, Database, Network, Zap,
  TrendingUp, RefreshCw, BookOpen, GitMerge,
  CheckCircle, Info, Ticket, Eye,
  Users, HeartHandshake, Gauge, Briefcase, Plus, Filter, ShieldCheck, AlertOctagon, Sparkles, Sliders,
  User
} from 'lucide-react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ─── Reusable Metric Card ─────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, color = "#6366f1", trend }) {
  return (
    <div className="metric-box">
      <div className="metric-icon-wrap" style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
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
  const [incidentViewMode, setIncidentViewMode] = useState("executive"); // 'executive' | 'diagnostics'

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

  // Forge Mission / Project Modal State
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

  // ─── 1-Click Common Outage Scenarios ─────────────────────────────────────────

  const quickScenarios = [
    {
      title: "💳 Payment Gateway Timeouts",
      text: "Payment system is timing out during customer checkout and database connections are overloaded under heavy traffic."
    },
    {
      title: "🗄️ Database Out of Connections",
      text: "User profile service cannot connect to the database because all available database connections are in use."
    },
    {
      title: "🔐 Login & Sign-in Failures",
      text: "Users are unable to log in because security login tokens are expiring and failing validation."
    },
    {
      title: "⚡ Order Processing Delay",
      text: "Customer orders are backing up in the processing queue, causing delivery status updates to stall."
    }
  ];

  // ─── Data Fetchers ──────────────────────────────────────────────────────────

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/tickets`);
      setTickets(res.data.tickets || []);
    } catch (e) {
      console.error("Failed to fetch tickets:", e);
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
      console.error("Failed to fetch history:", e);
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
      console.error("Failed to fetch metrics:", e);
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
      console.error("Failed to fetch HCM state:", e);
    } finally {
      setHcmLoading(false);
    }
  }, [selectedHrOpId]);

  // Initial load: fetch status & team state right away
  useEffect(() => {
    fetchMetrics();
    fetchHcmState();
  }, [fetchMetrics, fetchHcmState]);

  // View-specific trigger
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
    setIncidentViewMode("executive");

    try {
      const res = await axios.post(`${API_BASE}/workflow/run`, { request_text: requestText });
      setResult(res.data);
      setJobId(res.data.job_id);
      setChatMessages([
        { role: 'ai', content: res.data.decision || "Automated triage complete. What further remediation steps would you like to explore?" }
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
      setChatMessages(prev => [...prev, { role: 'ai', content: "**Notice**: Unable to connect with resolution copilot." }]);
    } finally {
      setIsChatting(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatActive, isChatting]);

  // ─── Team & Project Actions ─────────────────────────────────────────────────

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
      console.error("Forge project failed:", err);
    } finally {
      setMissionSubmitting(false);
    }
  };

  // ─── Filtered Team Members ──────────────────────────────────────────────────

  const filteredOperatives = operatives.filter(op => {
    if (matrixFilter === 'overloaded') return op.allocatedCapacity >= 100;
    if (matrixFilter === 'elevated') return op.allocatedCapacity >= 85 && op.allocatedCapacity < 100;
    if (matrixFilter === 'nominal') return op.allocatedCapacity < 85;
    return true;
  });

  // ─── Clean Corporate Navigation ─────────────────────────────────────────────

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Issues & Fixes' },
    { id: 'active_incidents', label: 'Fix an Issue', icon: AlertCircle, group: 'Issues & Fixes' },
    { id: 'tickets', label: 'Issue Tickets', icon: Ticket, group: 'Issues & Fixes' },
    { id: 'history', label: 'Issue History', icon: History, group: 'Issues & Fixes' },
    { id: 'resource_matrix', label: 'Team Workload', icon: Users, group: 'Team & Projects' },
    { id: 'talent_scout', label: 'Find Team Members', icon: Sparkles, group: 'Team & Projects' },
    { id: 'hr_wellbeing', label: 'Team Wellbeing', icon: HeartHandshake, group: 'Team & Projects' },
    { id: 'missions', label: 'Projects', icon: Briefcase, group: 'Team & Projects' },
    { id: 'settings', label: 'System Settings', icon: Settings, group: 'System' },
  ];

  const breadcrumb = {
    dashboard: 'Operations Overview',
    active_incidents: 'Fix an Issue',
    tickets: 'Issue Tickets',
    history: 'Issue History',
    resource_matrix: 'Team Workload',
    talent_scout: 'Find Team Members',
    hr_wellbeing: 'Team Wellbeing Check',
    missions: 'Projects',
    settings: 'System Settings',
  };

  return (
    <div className="layout">
      {/* ─── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Layers size={22} /></div>
          <div>
            <div className="brand-text">
              AgentSync
            </div>
            <div className="brand-version">Issue &amp; Team Management</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {['Issues & Fixes', 'Team & Projects', 'System'].map(group => (
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
                  <span>{label}</span>
                  {id === 'active_incidents' && result && (
                    <span className="nav-badge" style={{ background: result.status?.includes('Error') ? '#f43f5e' : '#10b981' }}>
                      {result.status?.includes('Error') ? '!' : '✓'}
                    </span>
                  )}
                  {id === 'resource_matrix' && metrics?.hcm?.overloaded_count > 0 && (
                    <span className="nav-badge" style={{ background: '#f43f5e' }}>{metrics.hcm.overloaded_count}</span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className={`status-dot ${apiHealth ? 'healthy' : 'degraded'}`}></div>
            <span>{apiHealth ? 'System Running Normally' : 'Connecting to Server...'}</span>
          </div>
          {metrics && (
            <div className="footer-uptime">Uptime: {metrics.platform?.uptime || '99.98%'}</div>
          )}
        </div>
      </aside>

      {/* ─── Main Content Area ────────────────────────────────────────────────── */}
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
              <Search size={15} color="var(--text-muted)" />
              <input type="text" placeholder="Search issues, team members, projects..." />
            </div>
            <button className="icon-btn" title="Notifications"><Bell size={17} /></button>
            <div className="user-profile" title="Admin User">U</div>
          </div>
        </header>

        {actionAlert && (
          <div className={`action-alert-banner ${actionAlert.type}`}>
            {actionAlert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{actionAlert.message}</span>
          </div>
        )}

        <div className="dashboard-body">

          {/* ── 1. Executive Operations Dashboard ────────────────────────────── */}
          {currentView === 'dashboard' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Operations Overview</h1>
                  <p className="page-subtitle">Live system status, team availability, and workload protection.</p>
                </div>
                <button className="btn-ghost" onClick={() => { fetchMetrics(); fetchHcmState(); }} disabled={metricsLoading}>
                  <RefreshCw size={14} className={metricsLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              {metricsLoading && !metrics ? (
                <div className="loading-state card">
                  <Activity className="spinner" size={36} color="#6366f1" />
                  <p>Loading system status and team workload...</p>
                </div>
              ) : metrics ? (
                <>
                  {/* Status Banner */}
                  <div className="health-banner healthy">
                    <CheckCircle size={18} />
                    <span><strong>System Status:</strong> All systems and services are running smoothly.</span>
                    <span className="health-ts">Updated: {new Date().toLocaleTimeString()}</span>
                  </div>

                  {/* Primary Operational KPIs */}
                  <div className="metrics-grid" style={{ marginTop: 20 }}>
                    <StatCard icon={AlertCircle} value={metrics.workflows?.workflows_last_24h || 1} label="Issues Solved (Last 24h)" color="#6366f1" trend="Avg Time: ~4s" />
                    <StatCard icon={CheckCircle2} value={metrics.workflows?.total_all_time || 0} label="Saved Solutions" color="#10b981" trend="Knowledge Base" />
                    <StatCard icon={Gauge} value={`${metrics.hcm?.average_headroom_pct || 22}%`} label="Team Free Time" color="#818cf8" trend="Available for new work" />
                    <StatCard
                      icon={AlertOctagon}
                      value={metrics.hcm?.overloaded_count || 0}
                      label="Fully Booked Members"
                      color={metrics.hcm?.overloaded_count > 0 ? "#f43f5e" : "#10b981"}
                      trend={metrics.hcm?.overloaded_count > 0 ? "Protected from extra work" : "Everyone has available time"}
                    />
                  </div>

                  {/* Team Bandwidth & Operational Safeguards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 20, marginTop: 20 }}>
                    {/* Live Specialist Bandwidth */}
                    <div className="card">
                      <div className="card-header">
                        <h3><Users size={16} /> Team Workload &amp; Availability</h3>
                        <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setCurrentView('resource_matrix')}>
                          View All Members <ChevronRight size={13} />
                        </button>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {operatives.slice(0, 5).map(op => {
                            const isOver = op.allocatedCapacity >= 100;
                            const isElev = op.allocatedCapacity >= 85 && op.allocatedCapacity < 100;
                            const fillClass = isOver ? 'overload' : (isElev ? 'elevated' : 'nominal');
                            const statusColor = isOver ? '#f43f5e' : (isElev ? '#f59e0b' : '#10b981');
                            return (
                              <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <img src={op.avatar} alt={op.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                                    <span>
                                      <strong>{op.name}</strong>
                                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>{op.role}</span>
                                    </span>
                                    <span style={{ fontWeight: 600, color: statusColor }}>
                                      {op.allocatedCapacity}% busy {isOver ? '(Fully Booked)' : `(${Math.max(0, 100 - op.allocatedCapacity)}% available)`}
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

                    {/* Operational Safeguards & Governance */}
                    <div className="card">
                      <div className="card-header">
                        <h3><ShieldCheck size={16} /> Workload Rules &amp; Protection</h3>
                      </div>
                      <div className="card-body">
                        <div className="info-list">
                          <div className="info-row">
                            <span>Smart Issue Solver</span>
                            <span className="info-value" style={{ color: '#818cf8' }}>Automated AI Analysis</span>
                          </div>
                          <div className="info-row">
                            <span>Maximum Workload Limit</span>
                            <strong style={{ color: '#f43f5e' }}>100% (Prevents Overwork)</strong>
                          </div>
                          <div className="info-row">
                            <span>High Workload Warning</span>
                            <strong style={{ color: '#f59e0b' }}>Above 85% busy</strong>
                          </div>
                          <div className="info-row">
                            <span>Total Team Members</span>
                            <span className="info-value">{operatives.length} Tracked</span>
                          </div>
                          <div className="info-row">
                            <span>Active Projects</span>
                            <span className="info-value">{projects.length} Running</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <Info size={40} />
                  <p>Unable to connect to the backend server. Please check that the server is running.</p>
                </div>
              )}
            </div>
          )}

          {/* ── 2. Diagnose & Fix an Issue ────────────────────────────────────── */}
          {currentView === 'active_incidents' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Diagnose &amp; Fix an Issue</h1>
                  <p className="page-subtitle">Describe what went wrong. The system will analyze the cause, outline how to fix it, and assign the best available team member.</p>
                </div>
                {result && (
                  <div className={`status-badge ${result.status?.includes('Error') ? 'error' : 'success'}`}>
                    {result.status?.includes('Error') ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}
                    {result.status?.includes('Error') ? 'Analysis Notice' : 'Fix Plan Ready'}
                  </div>
                )}
              </div>

              <div className="grid-layout">
                {/* Left Column — Problem Input & Results */}
                <div className="left-column">
                  <div className="card input-card">
                    <div className="card-header">
                      <h3><FileTerminal size={16} /> Describe the Problem</h3>
                    </div>
                    <div className="card-body">
                      {/* 1-Click Quick Scenario Presets */}
                      <div className="quick-scenarios-bar">
                        <div className="quick-scenarios-header">
                          <Sparkles size={13} color="#818cf8" />
                          <span>Sample Problems (Click to test):</span>
                        </div>
                        <div className="quick-scenarios-chips">
                          {quickScenarios.map((sc, i) => (
                            <button
                              key={i}
                              type="button"
                              className="scenario-pill"
                              onClick={() => setRequestText(sc.text)}
                            >
                              {sc.title}
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        className="enterprise-textarea"
                        rows={3}
                        placeholder="Describe what is happening, or click a sample problem above (e.g., Payment system is timing out during checkout...)"
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && runWorkflow()}
                      />
                      <div className="action-row">
                        <span className="hint-text">Press Ctrl+Enter to run</span>
                        <button className="btn-primary" onClick={runWorkflow} disabled={loading || !requestText.trim()}>
                          {loading ? <Activity className="spinner" size={16} /> : <Play size={16} />}
                          {loading ? "Analyzing the problem..." : "Find Cause & Fix Plan"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Real-Time Progress Steps */}
                  {loading && !result && (
                    <div className="pipeline-card card">
                      <div className="card-header">
                        <h3><GitMerge size={16} /> Investigating the Issue...</h3>
                      </div>
                      <div className="card-body">
                        <div className="pipeline-steps">
                          {[
                            { name: '1. Planning Review', desc: 'Checking which system areas need to be investigated...', icon: BookOpen },
                            { name: '2. Gathering Details', desc: 'Reviewing system logs, error reports, and guides...', icon: Search },
                            { name: '3. Finding Root Cause', desc: 'Pinpointing exactly what caused the problem...', icon: TrendingUp },
                            { name: '4. Finding Team Member', desc: 'Matching skills and confirming available time...', icon: Users },
                          ].map(({ name, desc, icon: Icon }, i) => (
                            <div key={i} className="pipeline-step">
                              <div className="step-icon"><Icon size={17} /></div>
                              <div style={{ flex: 1 }}>
                                <div className="step-name">{name}</div>
                                <div className="step-desc">{desc}</div>
                              </div>
                              <Activity className="spinner step-spinner" size={15} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results Container */}
                  {result && (
                    <div className="results-container">
                      {/* Error Banner */}
                      {result.errors?.length > 0 && (
                        <div className="error-banner">
                          <ShieldAlert size={18} />
                          <div style={{ flex: 1 }}>
                            <strong>AI Setup Notice:</strong>
                            {result.errors.some(e => e.includes('GROQ_API_KEY') || e.includes('api_key')) ? (
                              <p style={{ marginTop: 4, lineHeight: 1.5 }}>
                                Live AI answers require a valid <code>GROQ_API_KEY</code> in your environment file. The system has completed simulated diagnosis and solution planning.
                              </p>
                            ) : (
                              result.errors.map((e, i) => <p key={i} style={{ marginTop: 4 }}>{e}</p>)
                            )}
                          </div>
                        </div>
                      )}

                      {/* Operational KPI Summary */}
                      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="metric-box">
                          <div className="metric-icon-wrap" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                            <Clock size={19} color="#818cf8" />
                          </div>
                          <div>
                            <div className="metric-val">{result.execution_metrics?.duration_seconds || 4}s</div>
                            <div className="metric-label">Analysis Time</div>
                          </div>
                        </div>
                        <div className="metric-box">
                          <div className="metric-icon-wrap" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <ShieldCheck size={19} color="#10b981" />
                          </div>
                          <div>
                            <div className="metric-val" style={{ color: '#10b981' }}>100% Compliant</div>
                            <div className="metric-label">Workload Safeguard</div>
                          </div>
                        </div>
                        <div className="metric-box">
                          <div className="metric-icon-wrap" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}>
                            <Zap size={19} color="#c084fc" />
                          </div>
                          <div>
                            <div className="metric-val" style={{ color: '#c084fc' }}>High Priority</div>
                            <div className="metric-label">Urgency Level</div>
                          </div>
                        </div>
                      </div>

                      {/* ── Assigned Resolution Specialist Card ── */}
                      {result.assigned_engineer && (
                        <div className="smart-assignment-card">
                          <div className="assignment-header">
                            <div className="assignment-title">
                              <ShieldCheck size={19} color="#818cf8" />
                              <span>Assigned Team Member</span>
                            </div>
                            <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 10px', borderRadius: 100, fontSize: 11.5, fontWeight: 700 }}>
                              SKILL MATCH: {result.context_bundle?.fit_score || 85}% FIT
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
                              <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                                {result.assigned_engineer.skills?.slice(0, 5).map(s => (
                                  <span key={s} className="op-skill-chip">{s}</span>
                                ))}
                              </div>
                            </div>

                            <div className="headroom-meter-box">
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Current Workload:</span>
                                <strong>{result.assigned_engineer.capacity_before}% ➔ {result.assigned_engineer.capacity_after}%</strong>
                              </div>
                              <div className="capacity-bar-track">
                                <div
                                  className={`capacity-bar-fill ${result.assigned_engineer.capacity_after > 100 ? 'overload' : (result.assigned_engineer.capacity_after > 85 ? 'elevated' : 'nominal')}`}
                                  style={{ width: `${Math.min(100, result.assigned_engineer.capacity_after)}%` }}
                                />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 5, color: 'var(--text-muted)' }}>
                                <span>Available Free Time:</span>
                                <strong style={{ color: '#10b981' }}>{result.context_bundle?.remaining_headroom || 0}% Free Time</strong>
                              </div>
                            </div>
                          </div>

                          {/* Wellbeing Alert */}
                          {result.wellbeing_alert && (
                            <div className="disqualified-alert" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                              <HeartHandshake size={16} />
                              <span><strong>Workload Notice:</strong> {result.wellbeing_alert.message} — {result.wellbeing_alert.recommendation}</span>
                            </div>
                          )}

                          {/* Pre-Packaged Context Handoff */}
                          {result.context_bundle?.incident_diagnostics && (
                            <div className="telemetry-handoff-box">
                              <h5><FileTerminal size={13} /> Summary for Assigned Member</h5>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Affected Service:</span>
                                  <strong style={{ marginLeft: 8, color: '#fff' }}>{result.context_bundle.incident_diagnostics.affected_service}</strong>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Recommended Guide:</span>
                                  <strong style={{ marginLeft: 8, color: '#818cf8' }}>{result.context_bundle.incident_diagnostics.recommended_runbook}</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Workload Safeguard Notice */}
                          <div className="disqualified-alert" style={{ marginTop: 12, background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)', color: 'var(--text-muted)' }}>
                            <ShieldCheck size={15} color="#818cf8" />
                            <span>
                              <strong>Workload Protection:</strong> Team members who are already 100% busy are not assigned new issues to prevent burnout.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ── Simple View vs Technical Diagnostics Toggle ── */}
                      <div className="mode-switcher-card">
                        <div className="mode-switcher-bar">
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
                            Solution Details
                          </div>
                          <div className="segmented-toggle">
                            <button
                              type="button"
                              className={`segmented-btn ${incidentViewMode === 'executive' ? 'active' : ''}`}
                              onClick={() => setIncidentViewMode('executive')}
                            >
                              <BookOpen size={13} /> Overview
                            </button>
                            <button
                              type="button"
                              className={`segmented-btn ${incidentViewMode === 'diagnostics' ? 'active' : ''}`}
                              onClick={() => setIncidentViewMode('diagnostics')}
                            >
                              <FileTerminal size={13} /> Technical Details
                            </button>
                          </div>
                        </div>

                        {/* Executive Summary View (Corporate / Non-Technical) */}
                        {incidentViewMode === 'executive' && (
                          <div className="executive-briefing-grid">
                            <div className="briefing-box">
                              <div className="briefing-box-header" style={{ color: '#818cf8' }}>
                                <AlertCircle size={14} /> Why It Happened
                              </div>
                              <div className="briefing-box-content markdown-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {result.analysis || result.plan || "Analysis in progress."}
                                </ReactMarkdown>
                              </div>
                            </div>

                            <div className="briefing-box">
                              <div className="briefing-box-header" style={{ color: '#10b981' }}>
                                <CheckCircle size={14} /> How to Fix It
                              </div>
                              <div className="briefing-box-content markdown-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {result.decision || "Awaiting recommendations."}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Technical Diagnostics View (Deep Dive Tabs) */}
                        {incidentViewMode === 'diagnostics' && (
                          <div className="tabs-card">
                            <div className="tabs-header">
                              {[
                                { id: 'plan', label: '1. Action Steps', icon: BookOpen },
                                { id: 'investigation', label: '2. System Logs', icon: Search },
                                { id: 'analysis', label: '3. Cause Breakdown', icon: TrendingUp },
                                { id: 'decision', label: '4. Fix Instructions', icon: Zap },
                              ].map(({ id, label, icon: Icon }) => (
                                <button
                                  key={id}
                                  className={`tab-btn ${activeTab === id ? 'active' : ''}`}
                                  onClick={() => setActiveTab(id)}
                                >
                                  <Icon size={14} />
                                  {label}
                                </button>
                              ))}
                            </div>
                            <div className="tab-content markdown-body">
                              {activeTab === 'plan' && <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.plan || "*No plan generated.*"}</ReactMarkdown>}
                              {activeTab === 'investigation' && <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.investigation_results || "*No logs found.*"}</ReactMarkdown>}
                              {activeTab === 'analysis' && <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.analysis || "*No analysis available.*"}</ReactMarkdown>}
                              {activeTab === 'decision' && <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.decision || "*No instructions available.*"}</ReactMarkdown>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column — Resolution Copilot */}
                <div className="right-column">
                  {!result && !loading && (
                    <div className="resolution-prompt card">
                      <div className="prompt-icon"><AlertCircle size={28} /></div>
                      <h3>Issue Assistant</h3>
                      <p>Describe an issue on the left or click a sample problem to get an instant diagnosis and recommended fix.</p>
                    </div>
                  )}

                  {result && !chatActive && (
                    <div className="resolution-prompt card">
                      <div className="prompt-icon"><MessageSquare size={28} /></div>
                      <h3>Ask Questions About This Fix</h3>
                      <p>The cause has been found and a plan is ready. Open the chat to ask questions or verify next steps.</p>
                      <button className="btn-secondary" onClick={() => setChatActive(true)}>
                        Open Assistant Chat <ChevronRight size={15} />
                      </button>
                    </div>
                  )}

                  {chatActive && (
                    <div className="chat-interface card">
                      <div className="chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Layers size={16} color="#818cf8" />
                          <h4>Resolution Assistant</h4>
                        </div>
                        <span className="badge" style={{ background: '#10b981', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>
                          Online
                        </span>
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
                              <span className="typing-dots">Thinking...</span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="chat-input-area">
                        <input
                          type="text"
                          placeholder="Ask a question or request next steps..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                          disabled={isChatting}
                        />
                        <button className="send-btn" onClick={handleSendChat} disabled={!chatInput.trim() || isChatting}>
                          <Send size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── 3. Team Workload & Availability ─────────────────────────────── */}
          {currentView === 'resource_matrix' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Team Workload &amp; Availability</h1>
                  <p className="page-subtitle">See how busy each team member is, assign projects, and keep workloads balanced.</p>
                </div>
                <div className="matrix-header-actions">
                  <div className="segmented-toggle">
                    <button
                      className={`segmented-btn ${matrixViewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setMatrixViewMode('cards')}
                    >
                      <Users size={13} /> Team Members
                    </button>
                    <button
                      className={`segmented-btn ${matrixViewMode === 'matrix' ? 'active' : ''}`}
                      onClick={() => setMatrixViewMode('matrix')}
                    >
                      <Sliders size={13} /> Project Assignments
                    </button>
                  </div>
                  <button className="btn-ghost" onClick={fetchHcmState} disabled={hcmLoading}>
                    <RefreshCw size={14} className={hcmLoading ? 'spinner' : ''} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: 8, margin: '18px 0', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Filter size={13} /> Filter:
                </span>
                {[
                  { id: 'all', label: `All Members (${operatives.length})` },
                  { id: 'overloaded', label: `Fully Booked 100% (${operatives.filter(o => o.allocatedCapacity >= 100).length})` },
                  { id: 'elevated', label: `Busy 85-99% (${operatives.filter(o => o.allocatedCapacity >= 85 && o.allocatedCapacity < 100).length})` },
                  { id: 'nominal', label: `Available <85% (${operatives.filter(o => o.allocatedCapacity < 85).length})` },
                ].map(f => (
                  <button
                    key={f.id}
                    className="btn-ghost"
                    style={{
                      fontSize: 12,
                      padding: '5px 12px',
                      background: matrixFilter === f.id ? 'rgba(99,102,241,0.18)' : 'transparent',
                      color: matrixFilter === f.id ? '#a5b4fc' : 'var(--text-muted)',
                      borderColor: matrixFilter === f.id ? 'rgba(99,102,241,0.4)' : 'var(--border-color)'
                    }}
                    onClick={() => setMatrixFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Specialist Cards */}
              {matrixViewMode === 'cards' && (
                <div className="operatives-grid">
                  {filteredOperatives.map(op => {
                    const isOver = op.allocatedCapacity >= 100;
                    const isElev = op.allocatedCapacity >= 85 && op.allocatedCapacity < 100;
                    const fillClass = isOver ? 'overload' : (isElev ? 'elevated' : 'nominal');
                    const statusColor = isOver ? '#f43f5e' : (isElev ? '#f59e0b' : '#10b981');
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
                              <span style={{ color: 'var(--text-muted)' }}>Current Workload</span>
                              <strong style={{ color: statusColor }}>
                                {op.allocatedCapacity}% / {op.maxCapacity}%
                              </strong>
                            </div>
                            <div className="capacity-bar-track">
                              <div className={`capacity-bar-fill ${fillClass}`} style={{ width: `${Math.min(100, op.allocatedCapacity)}%` }} />
                            </div>
                            {isOver && (
                              <div className="burnout-alert-pill" style={{ marginTop: 4 }}>
                                <AlertOctagon size={13} />
                                <span>FULLY BOOKED: Protected from new tasks</span>
                              </div>
                            )}
                          </div>

                          {/* Performance Indicators */}
                          {op.stats && (
                            <div className="op-stats-row">
                              <div className="op-stat-item">
                                <span>Speed</span>
                                <strong>{op.stats.velocity}</strong>
                              </div>
                              <div className="op-stat-item">
                                <span>Quality</span>
                                <strong>{op.stats.codeQuality}</strong>
                              </div>
                              <div className="op-stat-item">
                                <span>Delivery</span>
                                <strong>{op.stats.delivery}</strong>
                              </div>
                              <div className="op-stat-item">
                                <span>Teamwork</span>
                                <strong>{op.stats.collaboration}</strong>
                              </div>
                            </div>
                          )}

                          {/* Technical Skills */}
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 5 }}>SKILLS</div>
                            <div className="op-skills-wrap">
                              {op.skills?.map(s => (
                                <span key={s} className="op-skill-chip">{s}</span>
                              ))}
                            </div>
                          </div>

                          {/* Active Projects */}
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 5 }}>ASSIGNED PROJECTS</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {op.assignedProjects?.length > 0 ? (
                                op.assignedProjects.map(pid => (
                                  <span key={pid} className="id-badge" style={{ fontSize: 11.5 }}>{pid}</span>
                                ))
                              ) : (
                                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>None (Available for new work)</span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                              className="btn-secondary"
                              style={{ width: '100%', fontSize: 12.5, justifyContent: 'center' }}
                              onClick={() => handleRunHrReview(op.id, null, true)}
                            >
                              <HeartHandshake size={14} /> Check Workload &amp; Health
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Allocation Matrix Grid */}
              {matrixViewMode === 'matrix' && (
                <div className="card" style={{ marginTop: 10 }}>
                  <div className="card-header">
                    <h3><Sliders size={16} /> Assign Projects to Team Members</h3>
                  </div>
                  <div className="table-responsive">
                    <table className="allocation-matrix-table">
                      <thead>
                        <tr>
                          <th>Team Member</th>
                          <th>Current Load</th>
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
                                  <img src={op.avatar} alt={op.name} style={{ width: 30, height: 30, borderRadius: '50%' }} />
                                  <div>
                                    <strong>{op.name}</strong>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{op.role}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontWeight: 700, color: isOver ? '#f43f5e' : '#10b981' }}>
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
                                      {isAssigned ? '✓ Assigned' : '+ Assign'}
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

              {/* Telemetry Stream */}
              <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                  <h3><Activity size={16} /> Recent Team Activity &amp; Workload Updates</h3>
                </div>
                <div className="card-body">
                  <div className="telemetry-ticker">
                    {hcmTelemetry.map((t, idx) => (
                      <div key={idx} className="telemetry-ticker-item">
                        <span className="ticker-time">[{t.time}]</span>
                        <span className="ticker-agent">{t.agent}:</span>
                        <span style={{ color: '#fff', flex: 1 }}>{t.detail}</span>
                        <span className="ticker-badge" style={{ background: t.badge?.includes('OVERLOAD') ? '#f43f5e' : '#10b981', color: '#fff' }}>
                          {t.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 4. Find Team Members ────────────────────────────────────────── */}
          {currentView === 'talent_scout' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Find Team Members</h1>
                  <p className="page-subtitle">Search for team members by skill or role. Only available members will be recommended.</p>
                </div>
              </div>

              {/* Search Container */}
              <div className="scout-search-container">
                <div className="scout-input-wrap">
                  <Sparkles size={22} color="#818cf8" />
                  <input
                    type="text"
                    className="scout-input"
                    placeholder="Describe skills needed (e.g., Python developer with database experience...)"
                    value={scoutQuery}
                    onChange={(e) => setScoutQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScoutSearch()}
                  />
                  <button className="btn-primary" onClick={() => handleScoutSearch()} disabled={scoutLoading || !scoutQuery.trim()}>
                    {scoutLoading ? <Activity className="spinner" size={16} /> : <Search size={16} />}
                    {scoutLoading ? "Searching..." : "Find Members"}
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="scout-presets">
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Sample Searches:</span>
                  {[
                    "Cloud Migration",
                    "Data Streaming",
                    "AI & Search Systems",
                    "Security & Compliance"
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
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

              {/* Match Results */}
              {scoutResults && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <h3 style={{ fontSize: 16, color: '#fff' }}>
                      Recommended Members ({scoutResults.candidates?.length} Available)
                    </h3>
                    {scoutResults.disqualified_overloaded?.length > 0 && (
                      <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.3)', padding: '4px 10px', borderRadius: 100, fontSize: 11.5, fontWeight: 700 }}>
                        {scoutResults.disqualified_overloaded.length} members are currently fully booked
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
                                <span style={{ color: 'var(--text-muted)' }}>Available Time</span>
                                <strong style={{ color: '#10b981' }}>{cand.remaining_headroom}% free</strong>
                              </div>
                              <div className="capacity-bar-track">
                                <div className="capacity-bar-fill nominal" style={{ width: `${cand.remaining_headroom}%` }} />
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 5 }}>MATCHED SKILLS</div>
                              <div className="op-skills-wrap">
                                {cand.matched_skills?.map(s => (
                                  <span key={s} className="op-skill-chip" style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#a5b4fc' }}>
                                    ✓ {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button
                              className="btn-primary"
                              style={{ width: '100%', fontSize: 12.5, justifyContent: 'center', marginTop: 6 }}
                              onClick={() => handleRunHrReview(op.id, null, true)}
                            >
                              <User size={14} /> View Member Profile
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Protected Specialists */}
                  {scoutResults.disqualified_overloaded?.length > 0 && (
                    <div className="card" style={{ marginTop: 26, border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.03)' }}>
                      <div className="card-header" style={{ color: '#fb7185' }}>
                        <h3><AlertOctagon size={16} /> Fully Booked Members (Protected from new work)</h3>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                          {scoutResults.disqualified_overloaded.map(dis => (
                            <div key={dis.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                              <img src={dis.avatar} alt={dis.name} style={{ width: 34, height: 34, borderRadius: '50%' }} />
                              <div>
                                <strong style={{ fontSize: 13, color: '#fff' }}>{dis.name} ({dis.callsign})</strong>
                                <div style={{ fontSize: 11.5, color: '#fb7185' }}>{dis.allocatedCapacity}% Busy (Not taking new work)</div>
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

          {/* ── 5. Team Wellbeing Check ─────────────────────────────────────── */}
          {currentView === 'hr_wellbeing' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Team Wellbeing &amp; Workload Check</h1>
                  <p className="page-subtitle">Review workload balance, project fit, and health indicators for any team member.</p>
                </div>
              </div>

              {/* Selector Bar */}
              <div className="wellbeing-emp-selector">
                <div className="selector-group">
                  <User size={16} color="#818cf8" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Team Member:</span>
                  <select value={selectedHrOpId} onChange={(e) => setSelectedHrOpId(e.target.value)}>
                    {operatives.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.callsign}) — {o.allocatedCapacity}% Load
                      </option>
                    ))}
                  </select>
                </div>

                <div className="selector-group">
                  <Briefcase size={16} color="#c084fc" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Check Fit for Project:</span>
                  <select value={selectedHrPrjId} onChange={(e) => setSelectedHrPrjId(e.target.value)}>
                    <option value="">(None - General Check)</option>
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
                  {hrReviewLoading ? "Checking..." : "Run Wellbeing Check"}
                </button>
              </div>

              {/* Assessment Results */}
              {hrAssessment ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 18 }}>
                    {hrAssessment.agents?.map((ag, idx) => (
                      <div key={idx} className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <strong style={{ color: '#fff', fontSize: 14.5 }}>{ag.agent}</strong>
                          <span
                            className="badge"
                            style={{
                              background: ag.status?.includes('OVER') || ag.status?.includes('NO_') ? 'rgba(244,63,94,0.15)' : 'rgba(99,102,241,0.15)',
                              color: ag.status?.includes('OVER') || ag.status?.includes('NO_') ? '#fb7185' : '#a5b4fc',
                              border: `1px solid ${ag.status?.includes('OVER') || ag.status?.includes('NO_') ? 'rgba(244,63,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                              padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700
                            }}
                          >
                            {ag.status}
                          </span>
                        </div>
                        <p style={{ fontSize: 13.5, color: 'var(--text-main)', marginBottom: 10, lineHeight: 1.55 }}>{ag.summary}</p>
                        {ag.evidence?.length > 0 && (
                          <ul className="hr-evidence-list">
                            {ag.evidence.map((ev, i) => (
                              <li key={i}>• {ev}</li>
                            ))}
                          </ul>
                        )}
                        {ag.recommendations?.length > 0 && (
                          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6, fontSize: 12.5, border: '1px solid rgba(245,158,11,0.2)' }}>
                            <strong style={{ color: '#fbbf24' }}>Recommendation:</strong> {ag.recommendations[0]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {hrAssessment.disclaimer && (
                    <div className="card" style={{ marginTop: 18, background: 'rgba(255,255,255,0.02)' }}>
                      <div className="card-body" style={{ padding: 14 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          ℹ️ {hrAssessment.disclaimer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card empty-state" style={{ padding: '64px 24px' }}>
                  <HeartHandshake size={42} color="#818cf8" />
                  <h3>Select a Team Member</h3>
                  <p>
                    Choose a team member above and click &quot;Run Wellbeing Check&quot; to review their workload balance, project fit, and health indicators.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── 6. Projects View ─────────────────────────────────────────────── */}
          {currentView === 'missions' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Projects</h1>
                  <p className="page-subtitle">Track active projects, required skills, team assignments, and deadlines.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-primary" onClick={() => setMissionModalOpen(true)}>
                    <Plus size={15} /> New Project
                  </button>
                  <button className="btn-ghost" onClick={fetchHcmState}>
                    <RefreshCw size={14} /> Refresh
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5, marginBottom: 14 }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Department:</span> <strong style={{ color: '#fff' }}>{prj.department}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Budget:</span> <strong style={{ color: '#fff' }}>{prj.budget}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Level:</span> <strong style={{ color: '#fff' }}>{prj.difficulty}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Deadline:</span> <strong style={{ color: '#fff' }}>{prj.deadline}</strong></div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 5 }}>REQUIRED SKILLS</div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {prj.requiredSkills?.map(s => (
                            <span key={s} className="op-skill-chip">{s}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Assigned Team Members</span>
                          <strong style={{ color: '#fff' }}>{prj.assignedOperativeIds?.length || 0} / {prj.requiredSlots || 3} Filled</strong>
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

          {/* ── 7. Issue Tickets ────────────────────────────────────────────── */}
          {currentView === 'tickets' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Issue Tickets</h1>
                  <p className="page-subtitle">All reported issues, current status, and resolution details.</p>
                </div>
                <button className="btn-ghost" onClick={fetchTickets} disabled={ticketsLoading}>
                  <RefreshCw size={14} className={ticketsLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              <div className="card" style={{ marginTop: 20 }}>
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Summary</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Urgency</th>
                        <th>Reported At</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketsLoading ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                          <Activity className="spinner" size={24} color="#6366f1" />
                        </td></tr>
                      ) : tickets.length === 0 ? (
                        <tr><td colSpan="7" className="empty-row">No tickets found.</td></tr>
                      ) : (
                        tickets.map((t) => (
                          <tr key={t.ticket_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(t)}>
                            <td>
                              <span className="id-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <Ticket size={12} />
                                {t.ticket_id}
                              </span>
                            </td>
                            <td className="truncate-cell" style={{ maxWidth: 300 }}>
                              <strong>{t.title}</strong>
                            </td>
                            <td>
                              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{t.type}</span>
                            </td>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background: t.status === 'Escalated' ? 'rgba(244,63,94,0.15)' : t.status === 'Resolved' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                color: t.status === 'Escalated' ? '#fb7185' : t.status === 'Resolved' ? '#34d399' : '#fbbf24',
                                border: `1px solid ${t.status === 'Escalated' ? 'rgba(244,63,94,0.3)' : t.status === 'Resolved' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                              }}>
                                {t.status}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: t.severity === 'High' ? '#fb7185' : '#818cf8'
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
                                <Eye size={13} /> View Details
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
                <div className="hr-modal-overlay" onClick={() => setSelectedTicket(null)}>
                  <div className="hr-modal-content" style={{ maxWidth: 740 }} onClick={(e) => e.stopPropagation()}>
                    <div className="card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Ticket size={20} color="#818cf8" />
                        <h3 style={{ margin: 0 }}>Ticket Details — {selectedTicket.ticket_id}</h3>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: selectedTicket.status === 'Escalated' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                          color: selectedTicket.status === 'Escalated' ? '#fb7185' : '#34d399'
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
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Reported At</span>
                          <strong>{selectedTicket.timestamp}</strong>
                        </div>
                      </div>

                      <h4 style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Issue Details &amp; Solution Steps</h4>
                      <div style={{ background: '#090e1a', border: '1px solid #1e293b', borderRadius: 6, padding: 16 }}>
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedTicket.content || '*No content available.*'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 8. Issue History ─────────────────────────────────────────────── */}
          {currentView === 'history' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Issue History</h1>
                  <p className="page-subtitle">Log of past resolved issues ({historyTotal} saved records).</p>
                </div>
                <button className="btn-ghost" onClick={fetchHistory} disabled={historyLoading}>
                  <RefreshCw size={14} className={historyLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              <div className="card" style={{ marginTop: 20 }}>
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Issue Description</th>
                        <th>Date &amp; Time</th>
                        <th>Solution Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLoading ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                          <Activity className="spinner" size={24} color="#6366f1" />
                        </td></tr>
                      ) : history.length === 0 ? (
                        <tr><td colSpan="4" className="empty-row">No past issue history found.</td></tr>
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

          {/* ── 9. System Settings View ─────────────────────────────────────── */}
          {currentView === 'settings' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">System Settings &amp; Status</h1>
                  <p className="page-subtitle">View server connections, AI engine status, and safety rules.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                {/* Integration Status Card */}
                <div className="card">
                  <div className="card-header"><h3><Network size={16} /> Server Connection</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Connection Status</span>
                        <span className="badge success" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                          Connected &amp; Running
                        </span>
                      </div>
                      <div className="info-row">
                        <span>Mode</span>
                        <strong style={{ color: '#818cf8' }}>{hcmSyncStatus?.mode || "Live Server Sync"}</strong>
                      </div>
                      <div className="info-row">
                        <span>Reliability</span>
                        <span className="info-value">Automatic failover enabled</span>
                      </div>
                      <div className="info-row">
                        <span>Server URL</span>
                        <span className="info-value">{API_BASE}</span>
                      </div>
                      <div className="info-row">
                        <span>Server Health</span>
                        <span className="info-value" style={{ color: '#10b981' }}>Operational</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Reasoning Core */}
                <div className="card">
                  <div className="card-header"><h3><Server size={16} /> AI Engine Settings</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>AI Service</span>
                        <span className="info-value">Cloud AI Engine</span>
                      </div>
                      <div className="info-row">
                        <span>AI Model</span>
                        <span className="info-value">{metrics?.agents?.model || 'Standard AI Model'}</span>
                      </div>
                      <div className="info-row">
                        <span>Process Engine</span>
                        <span className="info-value">Multi-Step Process Engine</span>
                      </div>
                      <div className="info-row">
                        <span>Steps Followed</span>
                        <span className="info-value">Plan ➔ Gather Details ➔ Root Cause ➔ Solution</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Persistence */}
                <div className="card">
                  <div className="card-header"><h3><Database size={16} /> Data Storage &amp; Records</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Saved Solutions</span>
                        <span className="info-value">Database of past solutions</span>
                      </div>
                      <div className="info-row">
                        <span>Activity Logs</span>
                        <span className="info-value">System event logs</span>
                      </div>
                      <div className="info-row">
                        <span>Team Workload Sync</span>
                        <span className="info-value">Live workload cache</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Burnout Governance */}
                <div className="card">
                  <div className="card-header"><h3><ShieldCheck size={16} /> Workload Protection Rules</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Maximum Workload Cap</span>
                        <strong style={{ color: '#f43f5e' }}>100% (Strict Limit)</strong>
                      </div>
                      <div className="info-row">
                        <span>When 100% Full</span>
                        <span className="info-value">Paused from new tasks automatically</span>
                      </div>
                      <div className="info-row">
                        <span>High Workload Alert</span>
                        <span className="info-value">Alerts sent when above 85% full</span>
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
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HeartHandshake size={20} color="#818cf8" />
                <h3 style={{ margin: 0 }}>Team Member Workload &amp; Wellbeing — {modalOperative.name}</h3>
                <span className="op-callsign">{modalOperative.callsign}</span>
              </div>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setHrModalOpen(false)}>✕</button>
            </div>

            <div className="card-body" style={{ overflowY: 'auto', padding: 24 }}>
              {hrReviewLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Activity className="spinner" size={32} color="#6366f1" />
                  <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Reviewing workload and health indicators...</p>
                </div>
              ) : hrAssessment ? (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Detailed breakdown across workload, skill match, speed, and health indicators:
                  </p>

                  {hrAssessment.agents?.map((ag, idx) => (
                    <div key={idx} className="hr-agent-item">
                      <div className="hr-agent-header">
                        <strong style={{ color: '#fff', fontSize: 13.5 }}>{ag.agent}</strong>
                        <span
                          className="hr-agent-badge"
                          style={{
                            background: ag.status?.includes('OVER') || ag.status?.includes('NO_') ? 'rgba(244,63,94,0.15)' : 'rgba(99,102,241,0.15)',
                            color: ag.status?.includes('OVER') || ag.status?.includes('NO_') ? '#fb7185' : '#a5b4fc'
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
                          <strong style={{ color: '#fbbf24' }}>Recommendation:</strong> {ag.recommendations[0]}
                        </div>
                      )}
                    </div>
                  ))}

                  {hrAssessment.disclaimer && (
                    <p style={{ fontSize: 11.5, color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 14 }}>
                      ⚠️ {hrAssessment.disclaimer}
                    </p>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <p>Unable to generate review.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Create New Project Modal ────────────────────────────────────────── */}
      {missionModalOpen && (
        <div className="hr-modal-overlay" onClick={() => setMissionModalOpen(false)}>
          <div className="hr-modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Briefcase size={18} color="#818cf8" />
                <h3 style={{ margin: 0 }}>Create New Project</h3>
              </div>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setMissionModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleForgeMission} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer Portal Redesign"
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
                  placeholder="e.g. Python, SQL, Cloud, React"
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
