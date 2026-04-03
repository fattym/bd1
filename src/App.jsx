import { useState, useEffect } from 'react';
import axios from 'axios';
import { Map, Marker } from 'pigeon-maps';
import { 
  Package, 
  PlusCircle, 
  History, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  ShoppingCart,
  LayoutDashboard,
  Users,
  Filter,
  Map as MapIcon,
  User as UserIcon,
  MapPin,
  TrendingUp,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:3000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventory, setInventory] = useState([]);
  const [stockLogs, setStockLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [analysisData, setAnalysisData] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([-1.286389, 36.817223]); // Default Nairobi

  // Analysis specific filters
  const [analysisRegionFilter, setAnalysisRegionFilter] = useState('all');
  const [analysisSearch, setAnalysisSearch] = useState('');

  // Map-specific filters
  const [mapRegionFilter, setMapRegionFilter] = useState('all');
  const [mapShopFilter, setMapShopFilter] = useState('all');

  // Derived filtered users for the map
  const filteredMapUsers = users.filter(user => {
    const regionMatch = mapRegionFilter === 'all' || user.region === mapRegionFilter;
    const shopMatch = mapShopFilter === 'all' || user.id.toString() === mapShopFilter;
    return regionMatch && shopMatch;
  });

  // Derived filtered analysis data
  const filteredAnalysis = analysisData.filter(item => {
    const regionMatch = analysisRegionFilter === 'all' || item.region === analysisRegionFilter;
    const searchMatch = item.productName.toLowerCase().includes(analysisSearch.toLowerCase()) || 
                       item.shopName.toLowerCase().includes(analysisSearch.toLowerCase());
    return regionMatch && searchMatch;
  });

  // Extract unique regions for the filter
  const uniqueRegions = [...new Set(users.map(user => user.region).filter(Boolean))];

  // Form states
  const [newProduct, setNewProduct] = useState({ barcode: '', name: '', userId: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  // Configure Axios with token
  const getAuthHeader = () => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setIsAuthenticated(true);
      fetchUsers();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [activeTab, selectedUserId, isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/admin-login`, {
        email: loginEmail,
        password: loginPassword
      });
      localStorage.setItem('adminToken', response.data.token);
      setAdminUser(response.data.user);
      setIsAuthenticated(true);
    } catch (err) {
      setLoginError('Invalid credentials. Please try again.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, { headers: getAuthHeader() });
      setUsers(response.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = { headers: getAuthHeader() };
      const userParam = selectedUserId !== 'all' ? `?userId=${selectedUserId}` : '';
      
      if (activeTab === 'dashboard') {
        const [invRes, logsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/inventory`, config),
          axios.get(`${API_BASE_URL}/stock-logs`, config)
        ]);
        setInventory(invRes.data);
        setStockLogs(logsRes.data);
      } else if (activeTab === 'inventory') {
        const response = await axios.get(`${API_BASE_URL}/inventory${userParam}`, config);
        setInventory(response.data);
      } else if (activeTab === 'logs') {
        const response = await axios.get(`${API_BASE_URL}/stock-logs${userParam}`, config);
        setStockLogs(response.data);
      } else if (activeTab === 'users' || activeTab === 'map') {
        fetchUsers();
      } else if (activeTab === 'analysis') {
        const response = await axios.get(`${API_BASE_URL}/analysis`, config);
        setAnalysisData(response.data);
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        handleLogout();
      } else {
        setError('Connection Error: Please ensure the backend server is active.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.userId) {
      setFormMessage({ type: 'error', text: 'Target user is required.' });
      return;
    }
    setFormLoading(true);
    setFormMessage({ type: '', text: '' });
    
    try {
      await axios.post(`${API_BASE_URL}/products`, newProduct, { headers: getAuthHeader() });
      setFormMessage({ type: 'success', text: 'Product registered!' });
      setNewProduct({ barcode: '', name: '', userId: '' });
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      setFormMessage({ type: 'error', text: msg });
    } finally {
      setFormLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card card">
          <div className="login-header">
            <div className="login-logo">
              <Activity className="logo-icon" size={48} />
            </div>
            <h1>RetailPro</h1>
            <p>Administrative Access Control</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Administrator Email</label>
              <div className="input-with-icon">
                <UserIcon size={18} />
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@retailpro.com"
                  autoFocus
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Secure Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  title={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="login-btn" disabled={isLoginLoading}>
              {isLoginLoading ? (
                <span className="btn-content">
                  <RefreshCw size={18} className="spin" /> Verifying...
                </span>
              ) : 'Secure Login'}
            </button>
            <div className="demo-hint" onClick={() => {
              setLoginEmail('admin@retailpro.com');
              setLoginPassword('password123');
            }}>
              Use Demo Credentials
            </div>
            {loginError && <div className="message error" style={{marginTop: '1rem'}}>{loginError}</div>}
          </form>
          <div className="login-footer">
            <p>© 2026 RetailPro Systems. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <Activity className="logo-icon" size={32} />
          <h1>RetailPro</h1>
        </div>
        <nav>
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''} 
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            className={activeTab === 'inventory' ? 'active' : ''} 
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={20} />
            Inventory
          </button>
          <button 
            className={activeTab === 'logs' ? 'active' : ''} 
            onClick={() => setActiveTab('logs')}
          >
            <History size={20} />
            Activity
          </button>
          <button 
            className={activeTab === 'users' ? 'active' : ''} 
            onClick={() => setActiveTab('users')}
          >
            <Users size={20} />
            Partners
          </button>
          <button 
            className={activeTab === 'map' ? 'active' : ''} 
            onClick={() => setActiveTab('map')}
          >
            <MapIcon size={20} />
            Network
          </button>
          <button 
            className={activeTab === 'analysis' ? 'active' : ''} 
            onClick={() => setActiveTab('analysis')}
          >
            <BarChart3 size={20} />
            Analysis
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="filter-section">
            <label><Filter size={14} /> Context Switch</label>
            <select 
              value={selectedUserId} 
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="all">Global View</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
            System Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="content">
        <header className="top-bar">
          <h2>
            {activeTab === 'dashboard' && 'System Overview'}
            {activeTab === 'inventory' && 'Inventory Management'}
            {activeTab === 'logs' && 'Real-time Activity'}
            {activeTab === 'users' && 'Partner Network'}
            {activeTab === 'map' && 'Geographic Distribution'}
            {activeTab === 'analysis' && 'Performance Analysis'}
          </h2>
          <div className="top-bar-actions">
            <button className="refresh-btn" onClick={fetchData} title="Refresh Data">
              <RefreshCw size={20} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertCircle size={24} />
            <div>
              <strong>System Notice:</strong> {error}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="dashboard-view">
             <section className="stats-grid">
              <div className="stat-card">
                <Users className="icon-blue" />
                <div className="stat-info">
                  <span className="label">Registered Partners</span>
                  <span className="value">{users.length}</span>
                </div>
              </div>
              <div className="stat-card">
                <Package className="icon-green" />
                <div className="stat-info">
                  <span className="label">Unique Products</span>
                  <span className="value">{inventory.length}</span>
                </div>
              </div>
              <div className="stat-card">
                <TrendingUp className="icon-orange" />
                <div className="stat-info">
                  <span className="label">Total Unit Count</span>
                  <span className="value">
                    {inventory.reduce((acc, item) => acc + item.current_quantity, 0)}
                  </span>
                </div>
              </div>
            </section>

            <div className="grid-layout">
              <div className="card">
                <h3>Recent Activity</h3>
                <div className="table-container" style={{marginTop: '1.5rem'}}>
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Partner</th>
                        <th>Product</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockLogs.slice(0, 5).map((log) => (
                        <tr key={log.id}>
                          <td style={{fontWeight: 600}}>{log.user.name}</td>
                          <td>{log.product.name}</td>
                          <td>
                            <span className={`change-badge ${log.change_amount >= 0 ? 'plus' : 'minus'}`}>
                              {log.change_amount >= 0 ? `+${log.change_amount}` : log.change_amount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <h3>Stock Alerts</h3>
                <div className="table-container" style={{marginTop: '1.5rem'}}>
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Owner</th>
                        <th>Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.filter(i => i.current_quantity < 20).slice(0, 5).map((item) => (
                        <tr key={item.id}>
                          <td className="product-name">{item.product.name}</td>
                          <td>{item.user.name}</td>
                          <td>
                            <span className="qty-badge low">{item.current_quantity}</span>
                          </td>
                        </tr>
                      ))}
                      {inventory.filter(i => i.current_quantity < 20).length === 0 && (
                        <tr><td colSpan="3" className="empty-state">All systems optimal. No low stock detected.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="inventory-view">
            <section className="stats-grid">
              <div className="stat-card">
                <Package className="icon-blue" />
                <div className="stat-info">
                  <span className="label">Active Items</span>
                  <span className="value">{inventory.length}</span>
                </div>
              </div>
              <div className="stat-card">
                <ShoppingCart className="icon-green" />
                <div className="stat-info">
                  <span className="label">Current Aggregate</span>
                  <span className="value">
                    {inventory.reduce((acc, item) => acc + item.current_quantity, 0)}
                  </span>
                </div>
              </div>
            </section>

            <div className="grid-layout">
              <div className="card add-form">
                <h3><PlusCircle size={22} /> New Product Registration</h3>
                <form onSubmit={handleAddProduct}>
                  <div className="form-group">
                    <label>Assign to Partner</label>
                    <select 
                      value={newProduct.userId}
                      onChange={(e) => setNewProduct({...newProduct, userId: e.target.value})}
                      required
                    >
                      <option value="">Select Target...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Product Identity (Barcode)</label>
                    <input 
                      type="text" 
                      placeholder="Scan or type barcode"
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Commercial Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Premium Blend 250g"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      required
                    />
                  </div>
                  <button type="submit" disabled={formLoading}>
                    {formLoading ? 'Processing...' : 'Complete Registration'}
                  </button>
                  {formMessage.text && (
                    <div className={`message ${formMessage.type}`}>
                      {formMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                      {formMessage.text}
                    </div>
                  )}
                </form>
              </div>

              <div className="card table-container">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Product Details</th>
                      <th>Identity</th>
                      <th>Ownership</th>
                      <th>Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id}>
                        <td><span className="product-name">{item.product.name}</span></td>
                        <td><code className="barcode">{item.product.barcode}</code></td>
                        <td>
                          <div className="owner-tag">
                            <UserIcon size={14} /> {item.user.name}
                          </div>
                        </td>
                        <td>
                          <span className={`qty-badge ${item.current_quantity < 5 ? 'low' : ''}`}>
                            {item.current_quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-view card table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Event Timestamp</th>
                  <th>Affected Item</th>
                  <th>Origin</th>
                  <th>Movement</th>
                  <th>Protocol</th>
                </tr>
              </thead>
              <tbody>
                {stockLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.product.name} <br/><small className="text-muted">{log.product.barcode}</small></td>
                    <td style={{fontWeight: 600}}>{log.user.name}</td>
                    <td>
                      <span className={`change-badge ${log.change_amount >= 0 ? 'plus' : 'minus'}`}>
                        {log.change_amount >= 0 ? `+${log.change_amount}` : log.change_amount}
                      </span>
                    </td>
                    <td><span className="reason-tag">{log.reason}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-view card table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Enterprise Name</th>
                  <th>Communication</th>
                  <th>Zone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="product-name">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <div className="location-cell" onClick={() => {
                        setMapCenter([user.latitude, user.longitude]);
                        setMapRegionFilter('all');
                        setMapShopFilter(user.id.toString());
                        setActiveTab('map');
                      }}>
                        <MapPin size={14} /> {user.region || 'Default'}
                      </div>
                    </td>
                    <td>
                      <span className="qty-badge">{user._count.products} Items</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="map-view">
            <div className="map-toolbar card">
              <div className="filter-group">
                <label><MapPin size={18} /> Zone Filter</label>
                <select 
                  value={mapRegionFilter}
                  onChange={(e) => {
                    setMapRegionFilter(e.target.value);
                    setMapShopFilter('all');
                  }}
                >
                  <option value="all">Everywhere</option>
                  {uniqueRegions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label><ShoppingCart size={18} /> Enterprise</label>
                <select 
                  value={mapShopFilter}
                  onChange={(e) => {
                    const shopId = e.target.value;
                    setMapShopFilter(shopId);
                    if (shopId !== 'all') {
                      const shop = users.find(u => u.id.toString() === shopId);
                      if (shop) setMapCenter([shop.latitude, shop.longitude]);
                    }
                  }}
                >
                  <option value="all">All Partners</option>
                  {users
                    .filter(u => mapRegionFilter === 'all' || u.region === mapRegionFilter)
                    .map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))
                  }
                </select>
              </div>
              <div className="results-count">
                Tracking <strong>{filteredMapUsers.length}</strong> active nodes
              </div>
            </div>

            <div className="card map-card">
              <Map height={600} center={mapCenter} zoom={mapShopFilter !== 'all' ? 16 : 13}>
                {filteredMapUsers.map(user => user.latitude && user.longitude && (
                  <Marker 
                    key={user.id}
                    anchor={[user.latitude, user.longitude]} 
                    payload={user}
                    onClick={({ payload }) => alert(`${payload.name}\n${payload.region} Node`)}
                  />
                ))}
              </Map>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="analysis-view">
            <section className="stats-grid">
              <div className="stat-card">
                <TrendingUp className="icon-blue" />
                <div className="stat-info">
                  <span className="label">Total Unit Sales</span>
                  <span className="value">
                    {filteredAnalysis.reduce((acc, item) => acc + item.totalSales, 0)}
                  </span>
                </div>
              </div>
              <div className="stat-card">
                <Activity className="icon-green" />
                <div className="stat-info">
                  <span className="label">Avg Turnover</span>
                  <span className="value">
                    {filteredAnalysis.length > 0 
                      ? (filteredAnalysis.reduce((acc, item) => acc + parseFloat(item.turnoverRate), 0) / filteredAnalysis.length).toFixed(2)
                      : '0.00'}
                  </span>
                </div>
              </div>
              <div className="stat-card">
                <MapPin className="icon-orange" />
                <div className="stat-info">
                  <span className="label">Regions Active</span>
                  <span className="value">{[...new Set(filteredAnalysis.map(i => i.region))].length}</span>
                </div>
              </div>
            </section>

            <div className="analysis-toolbar card">
              <div className="filter-group">
                <label><Filter size={14} /> Region</label>
                <select 
                  value={analysisRegionFilter}
                  onChange={(e) => setAnalysisRegionFilter(e.target.value)}
                >
                  <option value="all">All Regions</option>
                  {uniqueRegions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group" style={{flex: 1}}>
                <label><Package size={14} /> Search</label>
                <input 
                  type="text" 
                  placeholder="Filter product or shop..."
                  value={analysisSearch}
                  onChange={(e) => setAnalysisSearch(e.target.value)}
                />
              </div>
              <div className="results-count">
                Analyzing <strong>{filteredAnalysis.length}</strong> segments
              </div>
            </div>

            <div className="card table-container">
              <table className="analysis-table">
                <thead>
                  <tr>
                    <th>Product & Shop</th>
                    <th>Region</th>
                    <th>Stock</th>
                    <th>Sales</th>
                    <th>Restocks</th>
                    <th>Turnover</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnalysis.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="product-name">{item.productName}</span>
                        <br />
                        <small className="text-muted">at {item.shopName}</small>
                      </td>
                      <td><span className="reason-tag">{item.region}</span></td>
                      <td>
                        <span className={`qty-badge ${item.currentStock < 10 ? 'low' : ''}`}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td>
                        <span className="change-badge plus">{item.totalSales}</span>
                      </td>
                      <td>
                        <span className="change-badge" style={{color: 'var(--status-info)'}}>
                          {item.totalRestocks}
                        </span>
                      </td>
                      <td>
                        <strong>{(item.turnoverRate * 100).toFixed(0)}%</strong>
                      </td>
                      <td>
                        {item.turnoverRate > 0.5 ? (
                          <div className="performance-tag high">
                            <ArrowUpRight size={14} /> High
                          </div>
                        ) : item.turnoverRate > 0.2 ? (
                          <div className="performance-tag medium">
                            <Activity size={14} /> Stable
                          </div>
                        ) : (
                          <div className="performance-tag low">
                            <ArrowDownRight size={14} /> Low
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredAnalysis.length === 0 && !loading && (
                    <tr>
                      <td colSpan="7" className="empty-state">No performance data matches your current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;