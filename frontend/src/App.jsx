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
  Package, CheckCircle, XCircle, Info, ArrowUpRight, Ticket, Tag, CheckSquare, Eye
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

  useEffect(() => {
    if (currentView === "agent_fleet") fetchAgents();
    if (currentView === "history") fetchHistory();
    if (currentView === "tickets") fetchTickets();
    if (currentView === "dashboard") fetchMetrics();
    if (currentView === "tools") fetchTools();
  }, [currentView, fetchAgents, fetchHistory, fetchTickets, fetchMetrics, fetchTools]);

  // ─── Workflow ───────────────────────────────────────────────────────────────

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

  // ─── Render ─────────────────────────────────────────────────────────────────

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Main Menu' },
    { id: 'active_incidents', label: 'Incident Resolution', icon: AlertCircle, group: 'Main Menu' },
    { id: 'tickets', label: 'Incident Tickets', icon: Ticket, group: 'Main Menu' },
    { id: 'history', label: 'Investigations', icon: History, group: 'Main Menu' },
    { id: 'agent_fleet', label: 'Agent Fleet', icon: Cpu, group: 'System' },
    { id: 'tools', label: 'Enterprise Tools', icon: Wrench, group: 'System' },
    { id: 'settings', label: 'Settings', icon: Settings, group: 'System' },
  ];

  const breadcrumb = {
    dashboard: 'Platform Dashboard',
    active_incidents: 'Incident Resolution Center',
    tickets: 'Enterprise Incident Tickets',
    history: 'Investigation History',
    agent_fleet: 'Agent Fleet Status',
    tools: 'Enterprise Tools Registry',
    settings: 'Configuration & Settings',
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Layers size={24} color="#6366f1" /></div>
          <div>
            <span className="brand-text">AgentSync</span>
            <div className="brand-version">v1.0 Enterprise</div>
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

      {/* Main Content */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="breadcrumbs">
            <span>AgentSync</span>
            <ChevronRight size={14} />
            <span className="current">{breadcrumb[currentView]}</span>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={15} />
              <input type="text" placeholder="Search resources..." />
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
                  <h1 className="page-title">Platform Overview</h1>
                  <p className="page-subtitle">Real-time telemetry, agent metrics & system health</p>
                </div>
                <button className="btn-ghost" onClick={fetchMetrics} disabled={metricsLoading}>
                  <RefreshCw size={15} className={metricsLoading ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              {metricsLoading && !metrics ? (
                <div className="loading-state card">
                  <Activity className="spinner" size={36} color="#6366f1" />
                  <p>Loading platform metrics...</p>
                </div>
              ) : metrics ? (
                <>
                  {/* Health Banner */}
                  <div className={`health-banner ${apiHealth?.status === 'healthy' ? 'healthy' : 'degraded'}`}>
                    <CheckCircle size={18} />
                    <span><strong>System Status:</strong> {apiHealth?.status === 'healthy' ? 'All Systems Operational' : 'Degraded'}</span>
                    <span className="health-ts">Last checked: {new Date().toLocaleTimeString()}</span>
                  </div>

                  {/* Primary Metrics */}
                  <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 20 }}>
                    <StatCard icon={Cpu} value={metrics.agents.online} label="Active Agents" color="#6366f1" />
                    <StatCard icon={CheckCircle2} value={metrics.workflows.total_all_time} label="Total Investigations" color="#3fb950" />
                    <StatCard icon={Activity} value={metrics.workflows.workflows_last_24h} label="Last 24h" color="#58a6ff" />
                    <StatCard icon={Wrench} value={metrics.tools.total} label="Registered Tools" color="#a371f7" />
                  </div>

                  {/* Session Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                    <div className="card">
                      <div className="card-header">
                        <h3><BarChart3 size={16} /> Session Performance</h3>
                      </div>
                      <div className="card-body">
                        <div className="info-list">
                          <div className="info-row">
                            <span>Session Workflows</span>
                            <strong>{metrics.workflows.session_total}</strong>
                          </div>
                          <div className="info-row">
                            <span>Active Now</span>
                            <strong style={{ color: '#3fb950' }}>{metrics.workflows.session_active}</strong>
                          </div>
                          <div className="info-row">
                            <span>Completed</span>
                            <strong>{metrics.workflows.session_completed}</strong>
                          </div>
                          <div className="info-row">
                            <span>Errors</span>
                            <strong style={{ color: metrics.workflows.session_errors > 0 ? '#f85149' : '#3fb950' }}>
                              {metrics.workflows.session_errors}
                            </strong>
                          </div>
                          <div className="info-row">
                            <span>Avg. Duration</span>
                            <strong>{metrics.workflows.avg_duration_seconds}s</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <h3><Server size={16} /> Platform Configuration</h3>
                      </div>
                      <div className="card-body">
                        <div className="info-list">
                          <div className="info-row">
                            <span>Platform</span>
                            <strong>{metrics.platform.name} {metrics.platform.version}</strong>
                          </div>
                          <div className="info-row">
                            <span>LLM Provider</span>
                            <strong>Groq (Cloud)</strong>
                          </div>
                          <div className="info-row">
                            <span>Model</span>
                            <strong>{metrics.agents.model}</strong>
                          </div>
                          <div className="info-row">
                            <span>Uptime</span>
                            <strong style={{ color: '#3fb950' }}>{metrics.platform.uptime}</strong>
                          </div>
                          <div className="info-row">
                            <span>Orchestrator</span>
                            <strong>LangGraph</strong>
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
                  <p className="page-subtitle">Multi-agent orchestration for complex system failures</p>
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
                      <h3><FileTerminal size={16} /> Initialize Investigation</h3>
                    </div>
                    <div className="card-body">
                      <textarea
                        className="enterprise-textarea"
                        rows={3}
                        placeholder="Describe the incident (e.g. Payment API is returning 500 errors with high latency...)"
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && runWorkflow()}
                      />
                      <div className="action-row">
                        <span className="hint-text">Ctrl+Enter to run</span>
                        <button className="btn-primary" onClick={runWorkflow} disabled={loading || !requestText.trim()}>
                          {loading ? <Activity className="spinner" size={16} /> : <Play size={16} />}
                          {loading ? "Agents Orchestrating..." : "Run Analysis"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Steps (shown while loading) */}
                  {loading && !result && (
                    <div className="pipeline-card card">
                      <div className="card-header"><h3><GitMerge size={16} /> Agent Pipeline — Live</h3></div>
                      <div className="card-body">
                        <div className="pipeline-steps">
                          {[
                            { name: 'Planner Agent', desc: 'Generating execution plan...', icon: BookOpen },
                            { name: 'Investigation Agent', desc: 'Querying tools & gathering evidence...', icon: Search },
                            { name: 'Analysis Agent', desc: 'Performing root cause analysis...', icon: TrendingUp },
                            { name: 'Decision Agent', desc: 'Formulating resolution strategy...', icon: Zap },
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
                      <h3>Follow-up & Resolution</h3>
                      <p>The agents have produced their recommendation. Open the copilot to ask follow-up questions or execute the resolution steps.</p>
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
                  <p className="page-subtitle">Generated ITSM & Escalation Tickets: {tickets.length} total tickets tracked</p>
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

                      <h4 style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Ticket Content & Agent Recommendations</h4>
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
                  <h1 className="page-title">Agent Fleet Operations</h1>
                  <p className="page-subtitle">Autonomous AI agents coordinating across the enterprise platform</p>
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
                  <h1 className="page-title">Enterprise Tools Registry</h1>
                  <p className="page-subtitle">All tools available to the Investigation Agent for action execution</p>
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
                  <h1 className="page-title">Configuration & Settings</h1>
                  <p className="page-subtitle">Platform configuration, integrations, and environment information</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                <div className="card">
                  <div className="card-header"><h3><Server size={16} /> LLM & API Configuration</h3></div>
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
                        <span>API Key</span>
                        <span className="info-value">gsk_••••••••••••••••</span>
                      </div>
                      <div className="info-row">
                        <span>Orchestration Framework</span>
                        <span className="info-value">LangGraph</span>
                      </div>
                      <div className="info-row">
                        <span>LangChain Version</span>
                        <span className="info-value">1.x</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3><Database size={16} /> Memory & Storage</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row">
                        <span>Short-term Memory</span>
                        <span className="info-value">In-memory (session)</span>
                      </div>
                      <div className="info-row">
                        <span>Long-term Memory</span>
                        <span className="info-value">SQLite (agentsync_memory.db)</span>
                      </div>
                      <div className="info-row">
                        <span>Enterprise Mock DB</span>
                        <span className="info-value">SQLite (enterprise_mock.db)</span>
                      </div>
                      <div className="info-row">
                        <span>Memory Strategy</span>
                        <span className="info-value">Keyword-based retrieval</span>
                      </div>
                      <div className="info-row">
                        <span>History Retention</span>
                        <span className="info-value">Unlimited (SQLite)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3><GitMerge size={16} /> Workflow Configuration</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row"><span>Entry Node</span><span className="info-value">Planner Agent</span></div>
                      <div className="info-row"><span>Risk Routing</span><span className="info-value">Enabled (High/Medium/Low)</span></div>
                      <div className="info-row"><span>High Risk Behavior</span><span className="info-value">Direct → Decision</span></div>
                      <div className="info-row"><span>Medium Risk Behavior</span><span className="info-value">Re-investigate → Decision</span></div>
                      <div className="info-row"><span>Ticket Auto-creation</span><span className="info-value">Enabled (unmonitored services)</span></div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3><Globe size={16} /> API & Deployment</h3></div>
                  <div className="card-body">
                    <div className="info-list">
                      <div className="info-row"><span>API Framework</span><span className="info-value">FastAPI 0.141</span></div>
                      <div className="info-row"><span>API Server</span><span className="info-value">Uvicorn (ASGI)</span></div>
                      <div className="info-row"><span>API Base URL</span><span className="info-value">{API_BASE}</span></div>
                      <div className="info-row"><span>Frontend Framework</span><span className="info-value">React 19 + Vite</span></div>
                      <div className="info-row">
                        <span>API Docs</span>
                        <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" className="info-link">
                          /docs <ArrowUpRight size={11} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Architecture Diagram */}
              <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header"><h3><GitMerge size={16} /> Multi-Agent Workflow Architecture</h3></div>
                <div className="card-body">
                  <div className="workflow-diagram">
                    {[
                      { label: 'User Request', color: '#58a6ff', icon: User },
                      { label: 'Planner Agent', color: '#6366f1', icon: BookOpen },
                      { label: 'Investigation Agent', color: '#a371f7', icon: Search },
                      { label: 'Analysis Agent', color: '#e3b341', icon: TrendingUp },
                      { label: 'Risk Evaluator', color: '#f0883e', icon: AlertTriangle },
                      { label: 'Decision Agent', color: '#3fb950', icon: Zap },
                    ].map(({ label, color, icon: Icon }, i, arr) => (
                      <div key={i} className="diagram-step-wrap">
                        <div className="diagram-step" style={{ borderColor: color }}>
                          <Icon size={16} color={color} />
                          <span style={{ color }}>{label}</span>
                        </div>
                        {i < arr.length - 1 && <ChevronRight size={18} color="var(--text-muted)" />}
                      </div>
                    ))}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                    LangGraph StateGraph with conditional routing — Medium Risk triggers additional investigation pass.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
