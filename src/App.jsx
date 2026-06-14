import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import {
  Shield, Users, TrendingDown, HeartPulse, AlertTriangle,
  UploadCloud, Search, ArrowUpDown, X, FileDown, Check,
  Linkedin, Github, Eye
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  Label, LabelList
} from 'recharts';

const SAMPLE_DATA = [
  { id: 1, name: "Acme Corp", plan: "Enterprise", monthly_revenue: 2400, last_login_days: 45, usage_score: 22, support_tickets: 6, contract_months_remaining: 1 },
  { id: 2, name: "Blue Ridge Tech", plan: "Pro", monthly_revenue: 890, last_login_days: 3, usage_score: 78, support_tickets: 0, contract_months_remaining: 8 },
  { id: 3, name: "Coastal Systems", plan: "Starter", monthly_revenue: 290, last_login_days: 67, usage_score: 15, support_tickets: 4, contract_months_remaining: 2 },
  { id: 4, name: "Delta Analytics", plan: "Pro", monthly_revenue: 750, last_login_days: 12, usage_score: 65, support_tickets: 1, contract_months_remaining: 6 },
  { id: 5, name: "Echo Ventures", plan: "Free", monthly_revenue: 0, last_login_days: 90, usage_score: 8, support_tickets: 2, contract_months_remaining: 0 },
  { id: 6, name: "Falcon Industries", plan: "Enterprise", monthly_revenue: 3200, last_login_days: 5, usage_score: 88, support_tickets: 0, contract_months_remaining: 11 },
  { id: 7, name: "Granite Software", plan: "Starter", monthly_revenue: 180, last_login_days: 28, usage_score: 42, support_tickets: 3, contract_months_remaining: 3 },
  { id: 8, name: "Harbor Digital", plan: "Pro", monthly_revenue: 920, last_login_days: 55, usage_score: 31, support_tickets: 5, contract_months_remaining: 1 },
  { id: 9, name: "Iris Consulting", plan: "Starter", monthly_revenue: 240, last_login_days: 8, usage_score: 71, support_tickets: 0, contract_months_remaining: 9 },
  { id: 10, name: "Jasper Networks", plan: "Free", monthly_revenue: 0, last_login_days: 120, usage_score: 3, support_tickets: 8, contract_months_remaining: 0 },
  { id: 11, name: "Kestrel AI", plan: "Enterprise", monthly_revenue: 4100, last_login_days: 2, usage_score: 92, support_tickets: 1, contract_months_remaining: 14 },
  { id: 12, name: "Lunar Labs", plan: "Pro", monthly_revenue: 680, last_login_days: 33, usage_score: 28, support_tickets: 4, contract_months_remaining: 2 },
  { id: 13, name: "Maple Creek Co", plan: "Starter", monthly_revenue: 160, last_login_days: 19, usage_score: 55, support_tickets: 1, contract_months_remaining: 5 },
  { id: 14, name: "Nova Dynamics", plan: "Pro", monthly_revenue: 810, last_login_days: 71, usage_score: 18, support_tickets: 7, contract_months_remaining: 1 },
  { id: 15, name: "Orbit Solutions", plan: "Enterprise", monthly_revenue: 2800, last_login_days: 9, usage_score: 81, support_tickets: 0, contract_months_remaining: 10 },
  { id: 16, name: "Peak Performance", plan: "Starter", monthly_revenue: 200, last_login_days: 44, usage_score: 37, support_tickets: 2, contract_months_remaining: 3 },
  { id: 17, name: "Quasar Tech", plan: "Free", monthly_revenue: 0, last_login_days: 15, usage_score: 48, support_tickets: 0, contract_months_remaining: 0 },
  { id: 18, name: "Ridge Capital", plan: "Pro", monthly_revenue: 990, last_login_days: 6, usage_score: 74, support_tickets: 1, contract_months_remaining: 7 },
  { id: 19, name: "Summit Digital", plan: "Enterprise", monthly_revenue: 3600, last_login_days: 38, usage_score: 44, support_tickets: 3, contract_months_remaining: 2 },
  { id: 20, name: "Titan Robotics", plan: "Pro", monthly_revenue: 760, last_login_days: 22, usage_score: 59, support_tickets: 2, contract_months_remaining: 4 }
];

const COLORS = {
  high: '#b91c1c',
  medium: '#5b21b6',
  low: '#0369a1',
};

const calculateRisk = (c) => {
  let score = 100;
  
  if (c.last_login_days > 60) score -= 30;
  else if (c.last_login_days >= 31) score -= 20;
  else if (c.last_login_days >= 15) score -= 10;

  if (c.usage_score < 20) score -= 25;
  else if (c.usage_score <= 40) score -= 15;
  else if (c.usage_score <= 60) score -= 8;

  if (c.support_tickets > 5) score -= 20;
  else if (c.support_tickets >= 3) score -= 12;
  else if (c.support_tickets >= 1) score -= 5;

  if (c.contract_months_remaining < 1) score -= 20;
  else if (c.contract_months_remaining < 2) score -= 12;
  else if (c.contract_months_remaining <= 4) score -= 5;

  const plan = String(c.plan || '').toLowerCase();
  if (plan === 'enterprise') score += 5;
  else if (plan === 'pro') score += 3;
  else if (plan === 'starter') score += 1;

  score = Math.max(0, Math.min(100, score));

  let riskLevel = 'Low';
  if (score < 40) riskLevel = 'High';
  else if (score <= 69) riskLevel = 'Medium';

  return { 
    ...c, 
    health_score: score, 
    risk_level: c.dismissed ? 'Low' : riskLevel, 
    contacted: c.contacted || false,
    dismissed: c.dismissed || false
  };
};

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'health_score', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const fileInputRef = useRef(null);
  const [detectedColumns, setDetectedColumns] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const rowsPerPage = 10;

  useEffect(() => {
    const saved = localStorage.getItem('churniq_customers');
    if (saved) {
      try {
        setCustomers(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load data', e);
      }
    }
  }, []);

  const handleDataLoad = (data) => {
    const processed = data.map(c => calculateRisk({
      ...c,
      id: c.id || Math.random().toString(36).substr(2, 9),
      monthly_revenue: Number(c.monthly_revenue) || 0,
      last_login_days: Number(c.last_login_days) || 0,
      usage_score: Number(c.usage_score) || 0,
      support_tickets: Number(c.support_tickets) || 0,
      contract_months_remaining: Number(c.contract_months_remaining) || 0,
    }));
    setCustomers(processed);
    localStorage.setItem('churniq_customers', JSON.stringify(processed));
  };

  const loadSample = () => {
    handleDataLoad(SAMPLE_DATA);
  };

  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setDetectedColumns(results.meta.fields);
        handleDataLoad(results.data);
        setUploadSuccess(`✓ ${file.name} — ${results.data.length} rows loaded`);
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseCSV(e.dataTransfer.files[0]);
    }
  };

  const clearData = () => {
    setCustomers([]);
    setDetectedColumns(null);
    setUploadSuccess('');
    localStorage.removeItem('churniq_customers');
  };

  const toggleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase());
      const matchRisk = riskFilter === 'All' || c.risk_level === riskFilter;
      const matchPlan = planFilter === 'All' || c.plan === planFilter;
      return matchSearch && matchRisk && matchPlan;
    }).sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, search, riskFilter, planFilter, sortConfig]);

  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredCustomers.slice(start, start + rowsPerPage);
  }, [filteredCustomers, page]);

  const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage);

  const stats = useMemo(() => {
    const highRisk = customers.filter(c => c.risk_level === 'High');
    const atRiskRevenue = customers
      .filter(c => c.risk_level === 'High' || c.risk_level === 'Medium')
      .reduce((acc, c) => acc + (c.monthly_revenue || 0), 0);
    const avgHealth = customers.length > 0 
      ? customers.reduce((acc, c) => acc + c.health_score, 0) / customers.length 
      : 0;

    return {
      total: customers.length,
      highRiskCount: highRisk.length,
      highRiskPct: customers.length ? Math.round((highRisk.length / customers.length) * 100) : 0,
      atRiskRevenue,
      avgHealth: Math.round(avgHealth)
    };
  }, [customers]);

  const chartDataPie = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    customers.forEach(c => counts[c.risk_level]++);
    return [
      { name: 'High Risk', value: counts.High, color: COLORS.high },
      { name: 'Medium Risk', value: counts.Medium, color: COLORS.medium },
      { name: 'Low Risk', value: counts.Low, color: COLORS.low },
    ];
  }, [customers]);

  const chartDataBar = useMemo(() => {
    const revs = { High: 0, Medium: 0, Low: 0 };
    customers.forEach(c => revs[c.risk_level] += c.monthly_revenue);
    return [
      { name: 'High Risk', revenue: revs.High, fill: COLORS.high },
      { name: 'Medium Risk', revenue: revs.Medium, fill: COLORS.medium },
      { name: 'Low Risk', revenue: revs.Low, fill: COLORS.low },
    ];
  }, [customers]);

  const exportCSV = () => {
    const csv = Papa.unparse(filteredCustomers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'churniq_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = (customer) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Customer Report: ${customer.name}`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Risk Level: ${customer.risk_level}`, 20, 30);
    doc.text(`Health Score: ${customer.health_score}/100`, 20, 40);
    doc.text(`Plan: ${customer.plan}`, 20, 50);
    doc.text(`Monthly Revenue: AED ${customer.monthly_revenue}`, 20, 60);
    doc.text(`Last Login: ${customer.last_login_days} days ago`, 20, 70);
    doc.text(`Usage Score: ${customer.usage_score}/100`, 20, 80);
    doc.text(`Support Tickets: ${customer.support_tickets}`, 20, 90);
    doc.text(`Contract Remaining: ${customer.contract_months_remaining} months`, 20, 100);
    doc.save(`${customer.name.replace(/\s+/g, '_')}_RiskReport.pdf`);
  };

  const updateCustomer = (updated) => {
    const newCustomers = customers.map(c => c.id === updated.id ? calculateRisk(updated) : c);
    setCustomers(newCustomers);
    localStorage.setItem('churniq_customers', JSON.stringify(newCustomers));
    setSelectedCustomer(calculateRisk(updated));
  };

  const getHealthColor = (score) => {
    if (score >= 70) return 'text-sky';
    if (score >= 40) return 'text-violet';
    return 'text-red';
  };
  const getHealthBorder = (score) => {
    if (score >= 70) return 'border-sky';
    if (score >= 40) return 'border-violet';
    return 'border-red';
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <Shield className="stat-icon text-accent" size={28} style={{ color: 'var(--accent-color)' }} />
          <span className="app-title">ChurnIQ</span>
        </div>
        <div className="header-right">
          {customers.length > 0 && (
            <button className="clear-data-btn" onClick={clearData}>Clear Data</button>
          )}
          <div className="builder-info">
            Built by Huzefa Haveliwala
            <a href="https://linkedin.com/in/huzefa-haveliwala" target="_blank" rel="noreferrer" className="builder-link" title="LinkedIn">
              <Linkedin size={18} />
            </a>
            <a href="https://github.com/HuzefaH10/churn-risk-dashboard" target="_blank" rel="noreferrer" className="builder-link" title="GitHub">
              <Github size={18} />
            </a>
          </div>
        </div>
      </header>

      <main className="main-content">
        {customers.length === 0 ? (
          <section className="upload-section">
            <div 
              className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={48} className="upload-icon" />
              <div className="upload-text">Drop your customer CSV here or click to browse</div>
              <div className="upload-subtext">Required columns: customer_id, name, plan, monthly_revenue, last_login_days, usage_score, support_tickets, contract_months_remaining</div>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={(e) => e.target.files?.[0] && parseCSV(e.target.files[0])}
              />
            </div>
            <button className="load-sample-btn" onClick={loadSample}>
              Load Sample Data
            </button>
          </section>
        ) : (
          <>
            {detectedColumns && (
              <div className="info-banner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                {uploadSuccess && (
                  <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {uploadSuccess}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={18} />
                  Columns detected: {detectedColumns.join(', ')}. Missing columns use defaults.
                </div>
              </div>
            )}

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-title">Total Customers</span>
                  <Users className="stat-icon" size={20} />
                </div>
                <div className="stat-value">{stats.total}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-title">High Risk</span>
                  <AlertTriangle className="stat-icon" size={20} color={COLORS.high} />
                </div>
                <div className="stat-value text-red">
                  {stats.highRiskCount}
                  <span style={{ fontSize: '1rem', fontWeight: '500' }}>({stats.highRiskPct}%)</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-title">Revenue at Risk</span>
                  <TrendingDown className="stat-icon" size={20} color={COLORS.medium} />
                </div>
                <div className="stat-value text-violet">
                  AED {stats.atRiskRevenue.toLocaleString()}
                </div>
                <div className="stat-subtext">/ month at risk</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-title">Avg Health Score</span>
                  <HeartPulse className="stat-icon" size={20} />
                </div>
                <div className={`stat-value ${getHealthColor(stats.avgHealth)}`}>
                  {stats.avgHealth}
                </div>
              </div>
            </section>

            <section className="charts-grid">
              <div className="chart-card">
                <div className="chart-title">Risk Breakdown</div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataPie}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartDataPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <Label
                          position="center"
                          content={({ viewBox: { cx, cy } }) => (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={cx} dy="-0.2em" fontSize="24" fontWeight="bold" fill="#f3f4f6">{stats.total}</tspan>
                              <tspan x={cx} dy="1.2em" fontSize="12" fill="#9ca3af">customers</tspan>
                            </text>
                          )}
                        />
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f1420', borderColor: '#1f2937', color: '#f3f4f6' }} 
                        itemStyle={{ color: '#f3f4f6' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9ca3af' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-card">
                <div className="chart-title">Revenue by Risk Level</div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataBar} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <RechartsTooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#0f1420', borderColor: '#1f2937', color: '#f3f4f6' }} 
                        formatter={(val) => `AED ${val}`}
                      />
                      <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                        {chartDataBar.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList 
                          dataKey="revenue" 
                          position="top" 
                          formatter={(val) => `AED ${val.toLocaleString()}`} 
                          fill="#9ca3af" 
                          fontSize={12}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="table-card">
              <div className="table-header-controls">
                <div className="table-filters">
                  <div className="search-container">
                    <Search className="search-icon" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search customers..." 
                      className="search-input"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                  <div className="filter-group">
                    {['All', 'High', 'Medium', 'Low'].map(r => (
                      <button 
                        key={r}
                        className={`filter-btn ${riskFilter === r ? 'active' : ''}`}
                        onClick={() => { setRiskFilter(r); setPage(1); }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="filter-group">
                    {['All', 'Free', 'Starter', 'Pro', 'Enterprise'].map(p => (
                      <button 
                        key={p}
                        className={`filter-btn ${planFilter === p ? 'active' : ''}`}
                        onClick={() => { setPlanFilter(p); setPage(1); }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="export-btn" onClick={exportCSV}>
                  <FileDown size={16} /> Export CSV
                </button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort('risk_level')}>Risk <ArrowUpDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                      <th onClick={() => toggleSort('name')} style={{maxWidth: '160px'}}>Customer Name <ArrowUpDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                      <th onClick={() => toggleSort('plan')} style={{maxWidth: '90px'}}>Plan <ArrowUpDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                      <th onClick={() => toggleSort('monthly_revenue')}>Monthly Revenue <ArrowUpDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                      <th onClick={() => toggleSort('last_login_days')}>Last Login <ArrowUpDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                      <th onClick={() => toggleSort('usage_score')}>Usage Score <ArrowUpDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                      <th onClick={() => toggleSort('support_tickets')}>Tickets <ArrowUpDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                      <th onClick={() => toggleSort('contract_months_remaining')}>Contract <ArrowUpDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                      <th onClick={() => toggleSort('health_score')}>Health <ArrowUpDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.map(c => (
                      <tr key={c.id}>
                        <td>
                          <span className={`badge ${c.risk_level.toLowerCase()}`}>
                            {c.risk_level === 'High' ? '🔴' : c.risk_level === 'Medium' ? '🟣' : '🔵'} {c.risk_level}
                          </span>
                          {c.contacted && <span className="badge low" style={{marginLeft: '0.5rem'}}>✓ Contacted</span>}
                          {c.dismissed && <span className="badge" style={{marginLeft: '0.5rem', backgroundColor: '#374151', color: '#d1d5db'}}>Dismissed</span>}
                        </td>
                        <td style={{fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={c.name}>{c.name}</td>
                        <td style={{maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={c.plan}>{c.plan}</td>
                        <td style={{fontWeight: 600}}>AED {c.monthly_revenue}</td>
                        <td className={c.last_login_days > 30 ? 'text-red' : c.last_login_days >= 15 ? 'text-violet' : 'text-sky'}>
                          {c.last_login_days} days ago
                        </td>
                        <td>
                          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            <span>{c.usage_score}</span>
                            <div className="progress-bar-container">
                              <div 
                                className={`progress-bar ${c.usage_score < 30 ? 'bg-red' : c.usage_score <= 60 ? 'bg-violet' : 'bg-sky'}`} 
                                style={{width: `${c.usage_score}%`}}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className={c.support_tickets > 3 ? 'text-red' : c.support_tickets >= 1 ? 'text-violet' : 'text-sky'}>
                          {c.support_tickets}
                        </td>
                        <td className={c.contract_months_remaining < 2 ? 'text-red' : c.contract_months_remaining <= 4 ? 'text-violet' : 'text-sky'}>
                          {c.contract_months_remaining} mos
                        </td>
                        <td className={getHealthColor(c.health_score)} style={{fontSize: '1.125rem', fontWeight: 700}}>
                          {c.health_score}
                        </td>
                        <td>
                          <button className="view-icon-btn" title="View Details" onClick={() => setSelectedCustomer(c)}>
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedCustomers.length === 0 && (
                      <tr>
                        <td colSpan="10" style={{textAlign: 'center', padding: '2rem'}}>No customers found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <div>Showing {(page - 1) * rowsPerPage + (filteredCustomers.length > 0 ? 1 : 0)} - {Math.min(page * rowsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers</div>
                <div className="page-controls">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>&lt;</button>
                  <button className="page-btn" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>&gt;</button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <div>ChurnIQ &mdash; Subscription churn risk analyzer</div>
        <div>&copy; 2026 Huzefa Haveliwala</div>
      </footer>

      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-title">{selectedCustomer.name}</div>
                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                  <span className={`badge ${selectedCustomer.risk_level.toLowerCase()}`}>
                    {selectedCustomer.risk_level === 'High' ? '🔴' : selectedCustomer.risk_level === 'Medium' ? '🟣' : '🔵'} {selectedCustomer.risk_level} Risk
                  </span>
                  <span className="text-muted" style={{fontSize: '0.875rem'}}>{selectedCustomer.plan} Plan</span>
                </div>
              </div>
              <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <div className={`health-score-circle ${getHealthColor(selectedCustomer.health_score)} ${getHealthBorder(selectedCustomer.health_score)}`}>
                  {selectedCustomer.health_score}
                </div>
                <button className="close-btn" onClick={() => setSelectedCustomer(null)}><X size={20}/></button>
              </div>
            </div>
            
            <div className="modal-body">
              <div className="metrics-grid">
                <div className="metric-box">
                  <div className="metric-label">Monthly Revenue</div>
                  <div className="metric-value">AED {selectedCustomer.monthly_revenue}</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Last Login</div>
                  <div className={`metric-value ${selectedCustomer.last_login_days > 30 ? 'text-red' : ''}`}>{selectedCustomer.last_login_days} days ago</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Usage Score</div>
                  <div className={`metric-value ${selectedCustomer.usage_score < 30 ? 'text-red' : ''}`}>{selectedCustomer.usage_score}/100</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Support Tickets</div>
                  <div className={`metric-value ${selectedCustomer.support_tickets > 3 ? 'text-red' : ''}`}>{selectedCustomer.support_tickets} open</div>
                </div>
              </div>

              <div>
                <div className="section-title">Risk Factors</div>
                <ul className="risk-factors-list">
                  {selectedCustomer.last_login_days > 30 && <li className="border-red">⚠️ No login in {selectedCustomer.last_login_days} days — disengagement signal</li>}
                  {selectedCustomer.usage_score < 30 && <li className="border-red">⚠️ Usage score critically low ({selectedCustomer.usage_score}/100)</li>}
                  {selectedCustomer.support_tickets > 3 && <li className="border-violet">⚠️ High support volume ({selectedCustomer.support_tickets} tickets) — frustration signal</li>}
                  {selectedCustomer.contract_months_remaining < 2 && <li className="border-violet">⚠️ Contract expires in {selectedCustomer.contract_months_remaining} months — renewal risk</li>}
                  {selectedCustomer.monthly_revenue < 50 && <li className="border-violet">⚠️ Low revenue tier — lower switching cost</li>}
                  
                  {selectedCustomer.last_login_days <= 30 && selectedCustomer.usage_score >= 30 && selectedCustomer.support_tickets <= 3 && selectedCustomer.contract_months_remaining >= 2 && selectedCustomer.monthly_revenue >= 50 && (
                    <li className="border-sky">✅ No significant risk factors detected</li>
                  )}
                </ul>
              </div>

              <div>
                <div className="section-title">Recommended Actions</div>
                <ul className="recommendations-list">
                  {selectedCustomer.risk_level === 'High' && (
                    <>
                      <li className="border-red">Schedule an urgent customer success call this week</li>
                      <li className="border-red">Offer a 20% discount on annual renewal</li>
                      <li className="border-red">Send a personalized re-engagement email</li>
                      <li className="border-red">Escalate to account manager immediately</li>
                    </>
                  )}
                  {selectedCustomer.risk_level === 'Medium' && (
                    <>
                      <li className="border-violet">Send a check-in email with tips to improve usage</li>
                      <li className="border-violet">Invite to upcoming webinar or product training</li>
                      <li className="border-violet">Review their use case and suggest relevant features</li>
                    </>
                  )}
                  {selectedCustomer.risk_level === 'Low' && (
                    <>
                      <li className="border-sky">Identify upsell opportunity — consider proposing plan upgrade</li>
                      <li className="border-sky">Request a testimonial or case study</li>
                      <li className="border-sky">Enroll in loyalty/referral program</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="modal-actions">
                <button 
                  className="action-btn btn-primary"
                  onClick={() => {
                    updateCustomer({...selectedCustomer, contacted: true});
                  }}
                  disabled={selectedCustomer.contacted}
                  style={selectedCustomer.contacted ? {backgroundColor: '#374151', color: '#9ca3af', cursor: 'not-allowed'} : {}}
                >
                  {selectedCustomer.contacted ? 'Contacted ✓' : <><Check size={18}/> Mark as Contacted</>}
                </button>
                <button 
                  className="action-btn btn-secondary"
                  onClick={() => {
                    updateCustomer({...selectedCustomer, dismissed: true});
                  }}
                  disabled={selectedCustomer.dismissed}
                  style={selectedCustomer.dismissed ? {opacity: 0.5, cursor: 'not-allowed'} : {}}
                >
                  {selectedCustomer.dismissed ? 'Risk Dismissed' : 'Dismiss Risk'}
                </button>
                <button 
                  className="action-btn btn-secondary"
                  onClick={() => exportPDF(selectedCustomer)}
                >
                  <FileDown size={18}/> Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
