import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, Play, Server, TerminalSquare, Clock, AlertTriangle,
  Layers, Search, Bell, User, LayoutDashboard, AlertCircle,
  Settings, History, MessageSquare, Send, ChevronRight, CheckCircle2,
  Cpu, FileTerminal, ShieldAlert, Database, Network, Wrench, Zap,
  TrendingUp, RefreshCw, BookOpen, Globe, GitMerge, BarChart3,
  Package, CheckCircle, XCircle, Info, ArrowUpRight, Ticket, Tag, CheckSquare, Eye,
  Users, HeartHandshake, Gauge, Briefcase, Plus, Filter, ShieldCheck, AlertOctagon, Sparkles, Sliders
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

function ToolCategoryBadge({ category }) {
  const colors = {
    Observability: { bg: 'rgba(88,166,255,0.15)', text: '#58a6ff', border: 'rgba(88,166,255,0.3)' },
    Knowledge: { bg: 'rgba(163,113,247,0.15)', text: '#a371f7', border: 'rgba(163,113,247,0.3)' },
    Action: { bg: 'rgba(63,185,80,0.15)', text: '#3fb950', border: 'rgba(63,185,80,0.3)' },
    'Decision Support': { bg: 'rgba(240,136,62,0.15)', text: '#f0883e', border: 'rgba(240,136,62,0.3)' },
  };
  const c = colors[category] || colors.Action;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
      {category}
    </span>
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

  // Agent Fleet State
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Dashboard Metrics State
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [apiHealth, setApiHealth] = useState(null);

  // Tools State
  const [tools, setTools] = useState([]);
  const [toolsLoading, setToolsLoading] = useState(false);

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

  // HR Review Modal State
  const [hrModalOpen, setHrModalOpen] = useState(false);
  const [selectedOperativeForHR, setSelectedOperativeForHR] = useState(null);
  const [hrAssessment, setHrAssessment] = useState(null);
  const [hrReviewLoading, setHrReviewLoading] = useState(false);

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

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/agents`);
      setAgents(res.data.agents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAgentsLoading(false);
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

  const fetchTools = useCallback(async () => {
    setToolsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/tools`);
      setTools(res.data.tools || []);
    } catch (e) {
      console.error(e);
    } finally {
      setToolsLoading(false);
    }
  }, []);

  const fetchHcmState = useCallback(async () => {
    setHcmLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/hcm/state`);
      setOperatives(res.data.operatives || []);
      setProjects(res.data.projects || []);
      setHcmTelemetry(res.data.telemetry_logs || []);
      setHcmSyncStatus(res.data.sync_status || null);
    } catch (e) {
      console.error(e);
    } finally {
      setHcmLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentView === "agent_fleet") fetchAgents();
    if (currentView === "history") fetchHistory();
    if (currentView === "tickets") fetchTickets();
    if (currentView === "dashboard") {
      fetchMetrics();
      fetchHcmState();
    }
    if (currentView === "tools") fetchTools();
    if (currentView === "resource_matrix" || currentView === "missions") fetchHcmState();
  }, [currentView, fetchAgents, fetchHistory, fetchTickets, fetchMetrics, fetchTools, fetchHcmState]);

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
      // Refresh HCM state to show updated allocation after incident assignment
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

  const handleRunHrReview = async (op, prjId = null) => {
    setSelectedOperativeForHR(op);
    setHrModalOpen(true);
    setHrReviewLoading(true);
    setHrAssessment(null);
    try {
      const res = await axios.post(`${API_BASE}/hcm/hr-review`, {
        employee_id: op.id,
        project_id: prjId
      });
      setHrAssessment(res.data.assessment);
    } catch (err) {
      console.error("HR assessment failed:", err);
    } finally {
      setHrReviewLoading(false);
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

  // ─── Filtered Operatives ────────────────────────────────────────────────────

  const filteredOperatives = operatives.filter(op => {
    if (matrixFilter === 'overloaded') return op.allocatedCapacity >= 100;
    if (matrixFilter === 'elevated') return op.allocatedCapacity >= 85 && op.allocatedCapacity < 100;
    if (matrixFilter === 'nominal') return op.allocatedCapacity < 85;
    return true;
  });

  // ─── Navigation & Breadcrumbs ───────────────────────────────────────────────

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Main Menu' },
    { id: 'active_incidents', label: 'Incident Resolution', icon: AlertCircle, group: 'Main Menu' },
    { id: 'resource_matrix', label: 'Resource Matrix & HCM', icon: Users, group: 'Main Menu' },
    { id: 'missions', label: 'Enterprise Missions', icon: Briefcase, group: 'Main Menu' },
    { id: 'tickets', label: 'Incident Tickets', icon: Ticket, group: 'Main Menu' },
    { id: 'history', label: 'Investigations', icon: History, group: 'Main Menu' },
    { id: 'agent_fleet', label: 'Agent Fleet (9)', icon: Cpu, group: 'System' },
    { id: 'tools', label: 'Enterprise Tools (7)', icon: Wrench, group: 'System' },
    { id: 'settings', label: 'Settings & Dual-Stack', icon: Settings, group: 'System' },
  ];

  const breadcrumb = {
    dashboard: 'Platform Dashboard',
    active_incidents: 'Incident Resolution Center',
    resource_matrix: 'Human Capital Management & Resource Matrix',
    missions: 'Enterprise Mission Allocations',
    tickets: 'Enterprise Incident Tickets',
    history: 'Investigation History',
    agent_fleet: 'Agent Fleet Status (9 Autonomous Agents)',
    tools: 'Enterprise Tools Registry',
    settings: 'Configuration & Dual-Stack Architecture',
  };

  return (
    <div className="layout">
      {/* ─── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Layers size={24} color="#6366f1" /></div>
          <div>
            <span className="brand-text">AgentSync</span>
            <div className="brand-version">Decision Engine v1.0</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {['Main Menu', 'System'].map(group => (
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
              {group === 'Main Menu' && <div style={{ height: 16 }} />}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className={`status-dot ${apiHealth?.status === 'healthy' ? 'healthy' : 'degraded'}`}></div>
            <span>{apiHealth?.status === 'healthy' ? 'All Systems Operational' : 'Checking Status...'}</span>
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
              <span>{hcmSyncStatus?.mode || "In-Process Engine Active"}</span>
            </div>
            <div className="search-box">
              <Search size={15} />
              <input type="text" placeholder="Search operatives & resources..." />
            </div>
            <button className="icon-btn" title="Notifications"><Bell size={18} /></button>
            <div className="user-profile" title="Admin User"><User size={16} /></div>
          </div>
        </header>

        <div className="dashboard-body">

          {/* ── Dashboard View ──────────────────────────────────────────────── */}
          {currentView === 'dashboard' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Platform & Human Capital Overview</h1>
                  <p className="page-subtitle">Real-time telemetry, agent metrics, workforce headroom & system health</p>
                </div>
                <button className="btn-ghost" onClick={() => { fetchMetrics(); fetchHcmState(); }} disabled={metricsLoading}>
                  <RefreshCw size={15} className={metricsLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              {metricsLoading && !metrics ? (
                <div className="loading-state card">
                  <Activity className="spinner" size={36} color="#6366f1" />
                  <p>Loading platform metrics & workforce matrix...</p>
                </div>
              ) : metrics ? (
                <>
                  {/* Health Banner */}
                  <div className={`health-banner ${apiHealth?.status === 'healthy' ? 'healthy' : 'degraded'}`}>
                    <CheckCircle size={18} />
                    <span><strong>Dual-Stack Status:</strong> {hcmSyncStatus?.mode || "In-Process Fallback Engine Active (Zero-Interruption)"}</span>
                    <span className="health-ts">Last checked: {new Date().toLocaleTimeString()}</span>
                  </div>

                  {/* Primary Metrics (Merged AgentSync + Decision Engine) */}
                  <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 20 }}>
                    <StatCard icon={Cpu} value={metrics.agents.total || 9} label="Autonomous Agents" color="#6366f1" trend="4 Incident + 5 HCM" />
                    <StatCard icon={CheckCircle2} value={metrics.workflows.total_all_time} label="Total Investigations" color="#3fb950" />
                    <StatCard icon={Gauge} value={`${metrics.hcm?.average_headroom_pct || 22}%`} label="Avg Team Headroom" color="#58a6ff" trend="Capacity Available" />
                    <StatCard
                      icon={AlertOctagon}
                      value={metrics.hcm?.overloaded_count || 0}
                      label="Overloaded Personnel"
                      color={metrics.hcm?.overloaded_count > 0 ? "#f85149" : "#3fb950"}
                      trend={metrics.hcm?.overloaded_count > 0 ? "Disqualified from Incident Paging" : "Safe Operational Load"}
                    />
                  </div>

                  {/* Workforce & Platform Performance Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginTop: 20 }}>
                    {/* HCM Workforce Bandwidth */}
                    <div className="card">
                      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3><Users size={16} /> Human Capital Bandwidth & Headroom</h3>
                        <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setCurrentView('resource_matrix')}>
                          Open Matrix <ChevronRight size={13} />
                        </button>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {operatives.slice(0, 4).map(op => {
                            const isOver = op.allocatedCapacity >= 100;
                            const isElev = op.allocatedCapacity >= 85 && op.allocatedCapacity < 100;
                            const fillClass = isOver ? 'overload' : (isElev ? 'elevated' : 'nominal');
                            return (
                              <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <img src={op.avatar} alt={op.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                    <span><strong>{op.name}</strong> <code style={{ fontSize: 11, color: '#818cf8' }}>{op.callsign}</code></span>
                                    <span style={{ fontWeight: 600, color: isOver ? '#f85149' : (isElev ? '#e3b341' : '#3fb950') }}>
                                      {op.allocatedCapacity}%
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

                    {/* Platform Configuration */}
                    <div className="card">
                      <div className="card-header">
                        <h3><Server size={16} /> Integrated Architecture</h3>
                      </div>
                      <div className="card-body">
                        <div className="info-list">
                          <div className="info-row">
                            <span>Incident Engine</span>
                            <strong>Python / FastAPI / LangGraph</strong>
                          </div>
                          <div className="info-row">
                            <span>HCM Decision Engine</span>
                            <strong>Node.js / Express + In-Process Fallback</strong>
                          </div>
                          <div className="info-row">
                            <span>Burnout Safeguard</span>
                            <strong style={{ color: '#3fb950' }}>&lt; 100% Headroom Lock</strong>
                          </div>
                          <div className="info-row">
                            <span>Active Operatives</span>
                            <strong>{operatives.length} Tracked</strong>
                          </div>
                          <div className="info-row">
                            <span>Active Missions</span>
                            <strong>{projects.length} Registered</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Component Health Grid */}
                  <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                      <h3><Network size={16} /> Component Health</h3>
                    </div>
                    <div className="card-body">
                      <div className="component-grid">
                        {Object.entries(apiHealth?.components || {}).map(([name, status]) => {
                          const isHealthy = status === 'ok' || status === 'online' || status === 'connected' || status === 'groq';
                          return (
                            <div key={name} className={`component-chip ${isHealthy ? 'ok' : 'err'}`}>
                              {isHealthy ? <CheckCircle size={14} /> : <XCircle size={14} />}
                              {name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <Info size={40} />
                  <p>Could not connect to the API. Make sure the backend is running on port 8000.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Active Incidents View ────────────────────────────────────────── */}
          {currentView === 'active_incidents' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Incident Resolution Center</h1>
                  <p className="page-subtitle">Multi-agent orchestration with skill-aware engineer assignment &amp; telemetry handoff</p>
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
                          {loading ? "Agents Orchestrating..." : "Run Analysis & Dispatch"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Steps (shown while loading) */}
                  {loading && !result && (
                    <div className="pipeline-card card">
                      <div className="card-header"><h3><GitMerge size={16} /> Live Agent Orchestration &amp; Dispatch</h3></div>
                      <div className="card-body">
                        <div className="pipeline-steps">
                          {[
                            { name: 'Planner Agent', desc: 'Synthesizing incident execution plan...', icon: BookOpen },
                            { name: 'Investigation Agent', desc: 'Analyzing service logs & runbooks...', icon: Search },
                            { name: 'Analysis Agent', desc: 'Isolating root cause & risk severity...', icon: TrendingUp },
                            { name: 'Decision & HCM Matcher', desc: 'Evaluating headroom (<100%) & bundling context...', icon: Users },
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

                      {/* Execution Metrics */}
                      <div className="metrics-grid">
                        <div className="metric-box">
                          <div className="metric-icon-wrap" style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)' }}>
                            <Clock size={18} color="#58a6ff" />
                          </div>
                          <div>
                            <div className="metric-val">{result.execution_metrics?.duration_seconds || 0}s</div>
                            <div className="metric-label">Execution Time</div>
                          </div>
                        </div>
                        <div className="metric-box">
                          <div className="metric-icon-wrap" style={{ background: 'rgba(163,113,247,0.1)', border: '1px solid rgba(163,113,247,0.2)' }}>
                            <Server size={18} color="#a371f7" />
                          </div>
                          <div>
                            <div className="metric-val">{result.execution_metrics?.llm_calls || 0}</div>
                            <div className="metric-label">LLM Calls</div>
                          </div>
                        </div>
                        <div className="metric-box">
                          <div className="metric-icon-wrap" style={{ background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.2)' }}>
                            <TerminalSquare size={18} color="#3fb950" />
                          </div>
                          <div>
                            <div className="metric-val">{result.execution_metrics?.tool_calls || 0}</div>
                            <div className="metric-label">Tool Invocations</div>
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
                              <strong>Burnout Protection Active:</strong> Operatives at or above 100% capacity threshold (e.g. Elena Rostova @ 115%) are automatically disqualified from incident pager duty.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tabs */}
                      <div className="card tabs-card">
                        <div className="tabs-header">
                          {[
                            { id: 'plan', label: 'Execution Plan', icon: BookOpen },
                            { id: 'investigation', label: 'Investigation', icon: Search },
                            { id: 'analysis', label: 'Analysis', icon: TrendingUp },
                            { id: 'decision', label: 'Recommendation', icon: Zap },
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
                      <p>Submit an incident description to begin multi-agent analysis. The platform will orchestrate Planner, Investigation, Analysis, and Decision agents automatically.</p>
                    </div>
                  )}

                  {result && !chatActive && (
                    <div className="resolution-prompt card">
                      <div className="prompt-icon"><MessageSquare size={32} /></div>
                      <h3>Follow-up &amp; Resolution</h3>
                      <p>The agents have produced their recommendation and assigned the optimal engineer. Open the copilot to ask follow-up questions.</p>
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
                              <span className="typing-dots">Agent is thinking...</span>
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

          {/* ── Resource Matrix & HCM View ───────────────────────────────────── */}
          {currentView === 'resource_matrix' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Human Capital Management &amp; Resource Matrix</h1>
                  <p className="page-subtitle">Live bandwidth tracking, skill filtering, capacity headroom enforcement &amp; HR situation review</p>
                </div>
                <div className="matrix-header-actions">
                  <div className="tabs-header" style={{ margin: 0 }}>
                    <button
                      className={`tab-btn ${matrixViewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setMatrixViewMode('cards')}
                    >
                      <Users size={14} /> Operative Roster
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
                  { id: 'all', label: `All Operatives (${operatives.length})` },
                  { id: 'overloaded', label: `Overloaded ≥100% (${operatives.filter(o => o.allocatedCapacity >= 100).length})` },
                  { id: 'elevated', label: `Elevated 85-99% (${operatives.filter(o => o.allocatedCapacity >= 85 && op.allocatedCapacity < 100).length})` },
                  { id: 'nominal', label: `Nominal <85% (${operatives.filter(o => o.allocatedCapacity < 85).length})` },
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

              {/* View 1: Operatives Cards */}
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
                            <span className="op-level-badge">L{op.level}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="op-title-row">
                              <span className="op-name">{op.name}</span>
                              <span className="op-callsign">{op.callsign}</span>
                            </div>
                            <div className="op-role">{op.role}</div>
                          </div>
                        </div>

                        <div className="op-body">
                          {/* Capacity Meter */}
                          <div className="capacity-meter">
                            <div className="capacity-labels">
                              <span style={{ color: 'var(--text-muted)' }}>Workload Capacity</span>
                              <strong style={{ color: isOver ? '#f85149' : (isElev ? '#e3b341' : '#3fb950') }}>
                                {op.allocatedCapacity}% / {op.maxCapacity}%
                              </strong>
                            </div>
                            <div className="capacity-bar-track">
                              <div className={`capacity-bar-fill ${fillClass}`} style={{ width: `${Math.min(100, op.allocatedCapacity)}%` }} />
                            </div>
                            {isOver && (
                              <div className="burnout-alert-pill" style={{ marginTop: 4 }}>
                                <AlertOctagon size={13} />
                                <span>BURNOUT LOCKOUT: Over capacity threshold</span>
                              </div>
                            )}
                          </div>

                          {/* Stats Snapshot */}
                          {op.stats && (
                            <div className="op-stats-row">
                              <div className="op-stat-item">
                                <span>Velocity</span>
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
                                <span>Collab</span>
                                <strong>{op.stats.collaboration}</strong>
                              </div>
                            </div>
                          )}

                          {/* Skills */}
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TECHNICAL SKILLS</div>
                            <div className="op-skills-wrap">
                              {op.skills?.map(s => (
                                <span key={s} className="op-skill-chip">{s}</span>
                              ))}
                            </div>
                          </div>

                          {/* Active Missions */}
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ASSIGNED MISSIONS</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {op.assignedProjects?.length > 0 ? (
                                op.assignedProjects.map(pid => (
                                  <span key={pid} className="id-badge" style={{ fontSize: 11 }}>{pid}</span>
                                ))
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None (Bench)</span>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="op-actions">
                            <button
                              className="btn-secondary"
                              style={{ width: '100%', fontSize: 12, justifyContent: 'center' }}
                              onClick={() => handleRunHrReview(op)}
                            >
                              <HeartHandshake size={14} /> Launch 5-Agent HR Review
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
                    <h3><Sliders size={16} /> Interactive Mission Allocation Matrix (Live Headroom Recalculation)</h3>
                  </div>
                  <div className="table-responsive">
                    <table className="allocation-matrix-table">
                      <thead>
                        <tr>
                          <th>Operative</th>
                          <th>Load / Capacity</th>
                          {projects.map(p => (
                            <th key={p.id}>{p.codename}</th>
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
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{op.callsign}</div>
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

          {/* ── Enterprise Missions View ─────────────────────────────────────── */}
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

          {/* ── History View ─────────────────────────────────────────────────── */}
          {currentView === 'history' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Investigations Log</h1>
                  <p className="page-subtitle">Long-term memory: {historyTotal} total investigations stored in database</p>
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
                        <th>Final Decision (Preview)</th>
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

          {/* ── Tickets View ─────────────────────────────────────────────────── */}
          {currentView === 'tickets' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Incident Tickets</h1>
                  <p className="page-subtitle">Generated ITSM &amp; Escalation Tickets: {tickets.length} total tickets tracked</p>
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

                      <h4 style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Ticket Content &amp; Agent Recommendations</h4>
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

          {/* ── Agent Fleet View ─────────────────────────────────────────────── */}
          {currentView === 'agent_fleet' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Agent Fleet Operations (9 Autonomous Agents)</h1>
                  <p className="page-subtitle">Unified LangGraph Outage Orchestration Agents + Evidence-Based HCM Decision Agents</p>
                </div>
                <button className="btn-ghost" onClick={fetchAgents} disabled={agentsLoading}>
                  <RefreshCw size={15} className={agentsLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              {agentsLoading ? (
                <div className="loading-state card" style={{ marginTop: 20 }}>
                  <Activity className="spinner" size={36} color="#6366f1" />
                  <p>Loading agent fleet...</p>
                </div>
              ) : (
                <div className="agents-grid" style={{ marginTop: 20 }}>
                  {agents.map((agent) => (
                    <div key={agent.id} className="card agent-card">
                      <div className="agent-card-header">
                        <div className="agent-icon-wrap">
                          <Cpu size={20} color="#6366f1" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="agent-name">{agent.name}</div>
                          <div className="agent-role">{agent.role}</div>
                        </div>
                        <span className="status-badge success">
                          <span className="status-dot healthy" style={{ marginRight: 5 }}></span>
                          {agent.status}
                        </span>
                      </div>
                      <div className="card-body">
                        <p className="agent-desc">{agent.description}</p>
                        <div className="agent-model">
                          <Server size={12} /> {agent.model}
                        </div>
                        {agent.capabilities && (
                          <div className="capabilities-wrap">
                            {agent.capabilities.map(cap => (
                              <span key={cap} className="capability-chip">{cap}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {agents.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                      <Info size={36} />
                      <p>Could not load agents. Ensure the backend API is running.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tools View ───────────────────────────────────────────────────── */}
          {currentView === 'tools' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Enterprise Tools Registry (7 Tools)</h1>
                  <p className="page-subtitle">Diagnostic &amp; action execution tools for Investigation and Decision Agents</p>
                </div>
                <button className="btn-ghost" onClick={fetchTools} disabled={toolsLoading}>
                  <RefreshCw size={15} className={toolsLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              {toolsLoading ? (
                <div className="loading-state card" style={{ marginTop: 20 }}>
                  <Activity className="spinner" size={36} color="#6366f1" />
                  <p>Loading tools registry...</p>
                </div>
              ) : (
                <div className="tools-grid" style={{ marginTop: 20 }}>
                  {tools.map((tool) => (
                    <div key={tool.id} className="card tool-card">
                      <div className="tool-card-header">
                        <div className="tool-icon-wrap">
                          {tool.category === 'Observability' && <BarChart3 size={18} color="#58a6ff" />}
                          {tool.category === 'Knowledge' && <BookOpen size={18} color="#a371f7" />}
                          {tool.category === 'Action' && <Zap size={18} color="#3fb950" />}
                          {tool.category === 'Decision Support' && <Users size={18} color="#f0883e" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="tool-name">{tool.name}</div>
                        </div>
                        <ToolCategoryBadge category={tool.category} />
                      </div>
                      <div className="card-body" style={{ paddingTop: 12 }}>
                        <p className="tool-desc">{tool.description}</p>
                        <div className="tool-meta">
                          <div className="tool-meta-row">
                            <Database size={12} />
                            <span>{tool.data_source}</span>
                          </div>
                          <div className="tool-meta-row">
                            <Package size={12} />
                            <span>Parameters: <code>{tool.parameters.join(', ')}</code></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {tools.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                      <Info size={36} />
                      <p>Could not load tools. Ensure the backend API is running.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Settings View ────────────────────────────────────────────────── */}
          {currentView === 'settings' && (
            <div className="view-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Configuration &amp; Dual-Stack Architecture</h1>
                  <p className="page-subtitle">Dual-Stack integration between Python/FastAPI/LangGraph and Node.js/Express HCM</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                {/* Dual-Stack Status Card */}
                <div className="card">
                  <div className="card-header"><h3><Network size={16} /> Dual-Stack Integration Mode</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Integration Status</span>
                        <span className="badge success">Connected &amp; Synchronized</span>
                      </div>
                      <div className="info-row">
                        <span>Active Mode</span>
                        <strong style={{ color: '#818cf8' }}>{hcmSyncStatus?.mode || "In-Process Engine Active"}</strong>
                      </div>
                      <div className="info-row">
                        <span>Fault Tolerance</span>
                        <span className="info-value">Zero Operational Downtime (Auto-Fallback)</span>
                      </div>
                      <div className="info-row">
                        <span>Node.js Endpoint</span>
                        <span className="info-value">http://localhost:5000/api/state</span>
                      </div>
                      <div className="info-row">
                        <span>In-Process Fallback</span>
                        <span className="info-value">Python HCMManager Singleton</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3><Server size={16} /> LLM &amp; API Configuration</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>LLM Provider</span>
                        <span className="info-value">Groq Cloud</span>
                      </div>
                      <div className="info-row">
                        <span>Default Model</span>
                        <span className="info-value">{metrics?.agents?.model || 'openai/gpt-oss-20b'}</span>
                      </div>
                      <div className="info-row">
                        <span>Orchestration Framework</span>
                        <span className="info-value">LangGraph StateGraph</span>
                      </div>
                      <div className="info-row">
                        <span>API Base URL</span>
                        <span className="info-value">{API_BASE}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3><Database size={16} /> Memory &amp; Storage</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Long-term Memory</span>
                        <span className="info-value">SQLite (agentsync_memory.db)</span>
                      </div>
                      <div className="info-row">
                        <span>Enterprise Mock DB</span>
                        <span className="info-value">SQLite (enterprise_mock.db)</span>
                      </div>
                      <div className="info-row">
                        <span>Resource Allocation Matrix</span>
                        <span className="info-value">Dynamic InMemory + Sync</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3><ShieldCheck size={16} /> Burnout Prevention Rules</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Workload Safety Cap</span>
                        <strong style={{ color: '#f85149' }}>100% Active Workload</strong>
                      </div>
                      <div className="info-row">
                        <span>Overload Action</span>
                        <span className="info-value">Disqualify from Incident Paging</span>
                      </div>
                      <div className="info-row">
                        <span>Spike Alert Threshold</span>
                        <span className="info-value">&gt; 85% Capacity or Stress ≥ 70</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── 5-Agent HR Situation Review Modal ───────────────────────────────── */}
      {hrModalOpen && selectedOperativeForHR && (
        <div className="hr-modal-overlay" onClick={() => setHrModalOpen(false)}>
          <div className="hr-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HeartHandshake size={20} color="#818cf8" />
                <h3 style={{ margin: 0 }}>5-Agent HR Situation Review — {selectedOperativeForHR.name}</h3>
                <span className="op-callsign">{selectedOperativeForHR.callsign}</span>
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

      {/* ─── Forge Mission Modal ──────────────────────────────────────────────── */}
      {missionModalOpen && (
        <div className="hr-modal-overlay" onClick={() => setMissionModalOpen(false)}>
          <div className="hr-modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Briefcase size={18} color="#818cf8" />
                <h3 style={{ margin: 0 }}>Forge Enterprise Mission</h3>
              </div>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setMissionModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleForgeMission} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Mission Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Real-Time Kafka Stream Engine"
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
                  {missionSubmitting ? "Forging..." : "Register Mission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
