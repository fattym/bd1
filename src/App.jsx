import { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { Map, Marker } from "pigeon-maps";
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
  EyeOff,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ScanLine,
  Coins,
} from "lucide-react";

const API_BASE_URL = "https://bd2-0e8g.onrender.com/api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [inventory, setInventory] = useState([]);
  const [stockLogs, setStockLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [analysisData, setAnalysisData] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  // POS State
  const [posBarcode, setPosBarcode] = useState("");
  const [posPaymentMethod, setPosPaymentMethod] = useState("cash");
  const [posQuantity, setPosQuantity] = useState(1);
  const [posTargetUserId, setPosTargetUserId] = useState("");
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [posMessage, setPosMessage] = useState({ type: "", text: "" });

  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([-1.286389, 36.817223]); // Default Nairobi

  // Analysis specific filters
  const [analysisRegionFilter, setAnalysisRegionFilter] = useState("all");
  const [analysisSearch, setAnalysisSearch] = useState("");

  // Map-specific filters
  const [mapRegionFilter, setMapRegionFilter] = useState("all");
  const [mapShopFilter, setMapShopFilter] = useState("all");

  // Derived filtered users for the map
  const filteredMapUsers = users.filter((user) => {
    const regionMatch =
      mapRegionFilter === "all" || user.region === mapRegionFilter;
    const shopMatch =
      mapShopFilter === "all" || user.id.toString() === mapShopFilter;
    return regionMatch && shopMatch;
  });

  // Derived filtered analysis data
  const filteredAnalysis = analysisData.filter((item) => {
    const regionMatch =
      analysisRegionFilter === "all" || item.region === analysisRegionFilter;
    const searchMatch =
      item.productName.toLowerCase().includes(analysisSearch.toLowerCase()) ||
      item.shopName.toLowerCase().includes(analysisSearch.toLowerCase());
    return regionMatch && searchMatch;
  });

  // Extract unique regions for the filter
  const uniqueRegions = [
    ...new Set(users.map((user) => user.region).filter(Boolean)),
  ];

  // Form states
  const [newProduct, setNewProduct] = useState({
    barcode: "",
    name: "",
    userId: "",
    image: null,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: "", text: "" });

  // Configure Axios with token
  const getAuthHeader = () => {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("adminToken");
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
    setLoginError("");
    setIsLoginLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/admin-login`, {
        email: loginEmail,
        password: loginPassword,
      });
      localStorage.setItem("adminToken", response.data.token);
      setIsAuthenticated(true);
    } catch (err) {
      setLoginError("Invalid credentials. Please try again.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: getAuthHeader(),
      });
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
      const userParam =
        selectedUserId !== "all" ? `?userId=${selectedUserId}` : "";

      if (activeTab === "dashboard") {
        const [invRes, logsRes, analysisRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/inventory`, config),
          axios.get(`${API_BASE_URL}/stock-logs`, config),
          axios.get(`${API_BASE_URL}/analysis`, config),
        ]);
        setInventory(invRes.data);
        setStockLogs(logsRes.data);
        setAnalysisData(analysisRes.data);
      } else if (activeTab === "inventory") {
        const response = await axios.get(
          `${API_BASE_URL}/inventory${userParam}`,
          config,
        );
        setInventory(response.data);
      } else if (activeTab === "logs" || activeTab === "sales") {
        const response = await axios.get(
          `${API_BASE_URL}/stock-logs${userParam}`,
          config,
        );
        setStockLogs(response.data);
      } else if (activeTab === "users" || activeTab === "map") {
        fetchUsers();
      } else if (activeTab === "analysis") {
        const response = await axios.get(`${API_BASE_URL}/analysis`, config);
        setAnalysisData(response.data);
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        handleLogout();
      } else {
        setError(
          "Connection Error: Please ensure the backend server is active.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.userId) {
      setFormMessage({ type: "error", text: "Target user is required." });
      return;
    }
    setFormLoading(true);
    setFormMessage({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("barcode", newProduct.barcode);
      formData.append("name", newProduct.name);
      formData.append("userId", newProduct.userId);
      if (newProduct.image) {
        formData.append("image", newProduct.image);
      }

      await axios.post(`${API_BASE_URL}/products`, formData, {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "multipart/form-data",
        },
      });
      setFormMessage({ type: "success", text: "Product registered!" });
      setNewProduct({ barcode: "", name: "", userId: "", image: null });
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      setFormMessage({ type: "error", text: msg });
    } finally {
      setFormLoading(false);
    }
  };

  const handlePOSSale = async (e) => {
    e.preventDefault();
    if (!posTargetUserId) {
      setPosMessage({ type: "error", text: "Select a partner shop first." });
      return;
    }
    setIsProcessingSale(true);
    setPosMessage({ type: "", text: "" });

    try {
      const syncData = {
        updates: [
          {
            barcode: posBarcode,
            change: -Math.abs(posQuantity),
            paymentMethod: posPaymentMethod,
            timestamp: new Date().toISOString(),
            staffId: "ADMIN-POS",
          },
        ],
      };

      // We use a trick: the sync endpoint is for the authenticated user, 
      // but we need to sync for a specific user. 
      // In a real system, we'd have a specific admin POS endpoint.
      // For now, since the admin token is used, we might need to adjust the backend 
      // to allow admin to sync for others.
      // Wait, the backend syncInventory uses req.user.userId. 
      // Let's modify the backend syncInventory to allow admin to specify targetUserId.

      await axios.post(`${API_BASE_URL}/inventory/sync`, syncData, {
        headers: getAuthHeader(),
        params: { adminTargetUserId: posTargetUserId }
      });

      setPosMessage({ type: "success", text: "Sale completed successfully!" });
      setPosBarcode("");
      setPosQuantity(1);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || "Sale failed. Check barcode and stock.";
      setPosMessage({ type: "error", text: msg });
    } finally {
      setIsProcessingSale(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <Activity className="text-indigo-600" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">RetailPro</h1>
            <p className="text-gray-500">Administrative Access Control</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Administrator Email
              </label>
              <div className="relative">
                <UserIcon
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@retailpro.com"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  required
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secure Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  title={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isLoginLoading}
            >
              {isLoginLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={18} className="animate-spin" /> Verifying...
                </span>
              ) : (
                "Secure Login"
              )}
            </button>
            <div
              className="text-center text-sm text-gray-500 mt-6 cursor-pointer hover:text-indigo-600 hover:underline"
              onClick={() => {
                setLoginEmail("admin@retailpro.com");
                setLoginPassword("password123");
              }}
            >
              Click to use Demo Credentials
            </div>
            {loginError && (
              <div className="mt-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm">
                {loginError}
              </div>
            )}
          </form>
          <div className="text-center mt-8 text-xs text-gray-400">
            <p>© 2026 RetailPro Systems. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 text-gray-800 font-sans flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <Activity className="text-indigo-600" size={32} />
            <h1 className="text-xl font-bold">RetailPro</h1>
          </div>
          <nav className="flex gap-1">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${activeTab === "dashboard" ? "bg-indigo-100 text-indigo-700 font-semibold" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${activeTab === "inventory" ? "bg-indigo-100 text-indigo-700 font-semibold" : ""}`}
              onClick={() => setActiveTab("inventory")}
            >
              <Package size={18} />
              Inventory
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${activeTab === "logs" ? "bg-indigo-100 text-indigo-700 font-semibold" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              <History size={18} />
              Activity
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${activeTab === "users" ? "bg-indigo-100 text-indigo-700 font-semibold" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              <Users size={18} />
              Partners
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${activeTab === "map" ? "bg-indigo-100 text-indigo-700 font-semibold" : ""}`}
              onClick={() => setActiveTab("map")}
            >
              <MapIcon size={18} />
              Network
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${activeTab === "analysis" ? "bg-indigo-100 text-indigo-700 font-semibold" : ""}`}
              onClick={() => setActiveTab("analysis")}
            >
              <BarChart3 size={18} />
              Analysis
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${activeTab === "sales" ? "bg-indigo-100 text-indigo-700 font-semibold" : ""}`}
              onClick={() => setActiveTab("sales")}
            >
              <Coins size={18} />
              Sales
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${activeTab === "pos" ? "bg-indigo-100 text-indigo-700 font-semibold" : ""}`}
              onClick={() => setActiveTab("pos")}
            >
              <ScanLine size={18} />
              POS
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={14} />
              <select
                value={selectedUserId}
                className="p-2 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="all">Global View</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
              onClick={fetchData}
              title="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 flex items-center gap-4 rounded-r-md shadow-sm">
            <AlertCircle size={24} />
            <div>
              <strong>System Notice:</strong> {error}
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              System Overview
            </h2>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Users />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    Registered Partners
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    {users.length}
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Package />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Unique Products</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {inventory.length}
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <TrendingUp />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    Total Unit Count
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    {inventory.reduce(
                      (acc, item) => acc + item.current_quantity,
                      0,
                    )}
                  </span>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="text-green-600" size={20} /> Top Performing Products
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisData
                    .sort((a, b) => b.totalSales - a.totalSales)
                    .slice(0, 4)
                    .map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <div className="relative">
                          <span className="absolute -top-2 -left-2 w-6 h-6 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                            #{idx + 1}
                          </span>
                          {item.image_url ? (
                            <img src={item.image_url} className="w-12 h-12 rounded-lg object-cover shadow-sm" alt="" />
                          ) : (
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                              <Package size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 truncate">{item.productName}</div>
                          <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">{item.shopName}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-indigo-600">{item.totalSales}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">Sold</div>
                        </div>
                      </div>
                    ))}
                  {analysisData.length === 0 && (
                    <div className="col-span-2 py-10 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No sales data available yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Partner Distribution</h3>
                <div className="space-y-4">
                  {users.slice(0, 5).map(user => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <UserIcon size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{user.name}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold">{user.region}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{user._count.products}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold text-nowrap">Items</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setActiveTab("users")}
                  className="w-full mt-6 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  View Network
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Activity
                </h3>
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Partner</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stockLogs.slice(0, 5).map((log) => (
                        <tr key={log.id}>
                          <td className="px-4 py-3">
                            {log.product.image_url ? (
                              <img
                                src={log.product.image_url}
                                alt={log.product.name}
                                className="w-8 h-8 object-cover rounded border border-gray-100"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                                <Package size={14} />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {log.user.name}
                          </td>
                          <td className="px-4 py-3">{log.product.name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full inline-block ${log.change_amount >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                            >
                              {log.change_amount >= 0
                                ? `+${log.change_amount}`
                                : log.change_amount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Stock Alerts
                </h3>
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Owner</th>
                        <th className="px-4 py-3">Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {inventory
                        .filter((i) => i.current_quantity < 20)
                        .slice(0, 5)
                        .map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {item.product.name}
                            </td>
                            <td className="px-4 py-3">{item.user.name}</td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full inline-block bg-red-100 text-red-800">
                                {item.current_quantity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {inventory.filter((i) => i.current_quantity < 20)
                        .length === 0 && (
                        <tr>
                          <td
                            colSpan="3"
                            className="text-center py-8 text-gray-500"
                          >
                            All systems optimal. No low stock detected.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Inventory Management
            </h2>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Package />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Active Items</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {inventory.length}
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <ShoppingCart />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    Current Aggregate
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    {inventory.reduce(
                      (acc, item) => acc + item.current_quantity,
                      0,
                    )}
                  </span>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-1">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <PlusCircle size={22} /> New Product Registration
                </h3>
                <form onSubmit={handleAddProduct} className="mt-6 space-y-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Assign to Partner
                    </label>
                    <select
                      value={newProduct.userId}
                      className="p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, userId: e.target.value })
                      }
                      required
                    >
                      <option value="">Select Target...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Product Identity (Barcode)
                    </label>
                    <input
                      type="text"
                      className="p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Scan or type barcode"
                      value={newProduct.barcode}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          barcode: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Commercial Name
                    </label>
                    <input
                      type="text"
                      className="p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. Premium Blend 250g"
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Product Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          image: e.target.files[0],
                        })
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-md font-semibold hover:bg-indigo-700 transition-all duration-300 disabled:bg-indigo-400"
                  >
                    {formLoading ? "Processing..." : "Complete Registration"}
                  </button>
                  {formMessage.text && (
                    <div
                      className={`mt-4 p-3 rounded-md flex items-center gap-2 text-sm ${formMessage.type === "success" ? "bg-green-100 border border-green-200 text-green-800" : "bg-red-100 border border-red-200 text-red-700"}`}
                    >
                      {formMessage.type === "success" ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <AlertCircle size={18} />
                      )}
                      {formMessage.text}
                    </div>
                  )}
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Image</th>
                      <th className="px-4 py-3">Product Details</th>
                      <th className="px-4 py-3">Identity</th>
                      <th className="px-4 py-3">Ownership</th>
                      <th className="px-4 py-3">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inventory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          {item.product.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-100"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                              <Package size={20} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-800">
                            {item.product.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {item.product.barcode}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <UserIcon size={14} /> {item.user.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block ${item.current_quantity < 20 ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}`}
                          >
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

        {activeTab === "logs" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Real-time Activity
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Event Timestamp</th>
                    <th className="px-4 py-3">Affected Item</th>
                    <th className="px-4 py-3">Origin</th>
                    <th className="px-4 py-3">Movement</th>
                    <th className="px-4 py-3">Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stockLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3">
                        {log.product.image_url ? (
                          <img
                            src={log.product.image_url}
                            alt={log.product.name}
                            className="w-10 h-10 object-cover rounded border border-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                            <Package size={16} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {log.product.name} <br />
                        <small className="text-gray-500">
                          {log.product.barcode}
                        </small>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {log.user.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full inline-block ${log.change_amount >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {log.change_amount >= 0
                            ? "+" + log.change_amount
                            : log.change_amount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {log.reason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Partner Network
              </h2>
              <div className="text-sm text-gray-500">
                Tracking <strong>{users.length}</strong> active retail partners
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 w-12"></th>
                      <th className="px-6 py-4">Enterprise Name</th>
                      <th className="px-6 py-4">Communication</th>
                      <th className="px-6 py-4">Zone</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <Fragment key={user.id}>
                        <tr
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedUserId === user.id ? "bg-indigo-50/30" : ""}`}
                          onClick={() =>
                            setExpandedUserId(
                              expandedUserId === user.id ? null : user.id,
                            )
                          }
                        >
                          <td className="px-6 py-4">
                            <button
                              className={`p-1 rounded-full transition-all duration-200 ${expandedUserId === user.id ? "bg-indigo-100 text-indigo-600 rotate-180" : "hover:bg-gray-100 text-gray-400"}`}
                            >
                              <ChevronDown size={18} />
                            </button>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-800">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className="flex items-center gap-1.5 text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMapCenter([user.latitude, user.longitude]);
                                setMapRegionFilter("all");
                                setMapShopFilter(user.id.toString());
                                setActiveTab("map");
                              }}
                            >
                              <MapPin size={14} /> {user.region || "Default"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block ${user._count.products > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                            >
                              {user._count.products} Items Tracked
                            </span>
                          </td>
                        </tr>

                        {expandedUserId === user.id && (
                          <tr>
                            <td colSpan="5" className="px-6 py-0 bg-gray-50/50">
                              <div className="py-6 px-6 border-t border-b border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <Package size={14} /> Product Catalog for{" "}
                                  {user.name}
                                </h4>
                                {user.products && user.products.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {user.products.map((product) => (
                                      <div
                                        key={product.id}
                                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-indigo-200 hover:shadow-md transition-all group"
                                      >
                                        <div className="relative">
                                          {product.image_url ? (
                                            <img
                                              src={product.image_url}
                                              alt={product.name}
                                              className="w-14 h-14 object-cover rounded-lg border border-gray-100"
                                            />
                                          ) : (
                                             <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                              <Package size={24} />
                                            </div>
                                          )}
                                          <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            LIVE
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-bold text-gray-900 truncate">
                                            {product.name || "Unnamed Product"}
                                          </p>
                                          <p className="text-xs font-mono text-gray-400 mb-2">
                                            {product.barcode}
                                          </p>
                                          <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                              <span className="text-[10px] text-gray-400 uppercase font-bold">
                                                Inventory
                                              </span>
                                              <span
                                                className={`text-sm font-black ${
                                                  (product.inventory
                                                    ?.current_quantity || 0) <
                                                  20
                                                    ? "text-orange-500"
                                                    : "text-indigo-600"
                                                }`}
                                              >
                                                {product.inventory
                                                  ?.current_quantity || 0}{" "}
                                                Units
                                              </span>
                                            </div>
                                            {(product.inventory
                                              ?.current_quantity || 0) < 20 && (
                                              <div className="bg-orange-50 text-orange-600 p-1.5 rounded-lg">
                                                <AlertCircle size={16} />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                                    <div className="flex justify-center mb-3">
                                      <div className="p-3 bg-gray-50 rounded-full text-gray-400">
                                        <PlusCircle size={32} />
                                      </div>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900">
                                      No products assigned
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Use the Inventory tab to register
                                      products for this partner.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Geographic Distribution
            </h2>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin size={18} /> Zone Filter
                </label>
                <select
                  className="p-2 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  value={mapRegionFilter}
                  onChange={(e) => {
                    setMapRegionFilter(e.target.value);
                    setMapShopFilter("all");
                  }}
                >
                  <option value="all">Everywhere</option>
                  {uniqueRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <ShoppingCart size={18} /> Enterprise
                </label>
                <select
                  className="p-2 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  value={mapShopFilter}
                  onChange={(e) => {
                    const shopId = e.target.value;
                    setMapShopFilter(shopId);
                    if (shopId !== "all") {
                      const shop = users.find(
                        (u) => u.id.toString() === shopId,
                      );
                      if (shop) setMapCenter([shop.latitude, shop.longitude]);
                    }
                  }}
                >
                  <option value="all">All Partners</option>
                  {users
                    .filter(
                      (u) =>
                        mapRegionFilter === "all" ||
                        u.region === mapRegionFilter,
                    )
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="text-sm text-gray-600 ml-auto">
                Tracking <strong>{filteredMapUsers.length}</strong> active nodes
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <Map
                height={600}
                center={mapCenter}
                zoom={mapShopFilter !== "all" ? 16 : 13}
              >
                {filteredMapUsers.map(
                  (user) =>
                    user.latitude &&
                    user.longitude && (
                      <Marker
                        key={user.id}
                        anchor={[user.latitude, user.longitude]}
                        payload={user}
                        onClick={({ payload }) =>
                          alert(`${payload.name}\n${payload.region} Node`)
                        }
                      />
                    ),
                )}
              </Map>
            </div>
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Performance Analysis
            </h2>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <TrendingUp size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    Total Unit Sales
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    {filteredAnalysis.reduce(
                      (acc, item) => acc + item.totalSales,
                      0,
                    )}
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Activity size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Avg Turnover</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {filteredAnalysis.length > 0
                      ? (
                          filteredAnalysis.reduce(
                            (acc, item) => acc + parseFloat(item.turnoverRate),
                            0,
                          ) / filteredAnalysis.length
                        ).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <MapPin size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Regions Active</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {[...new Set(filteredAnalysis.map((i) => i.region))].length}
                  </span>
                </div>
              </div>
            </section>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Filter size={14} /> Region
                </label>
                <select
                  className="p-2 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  value={analysisRegionFilter}
                  onChange={(e) => setAnalysisRegionFilter(e.target.value)}
                >
                  <option value="all">All Regions</option>
                  {uniqueRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Package size={14} /> Search
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Filter product or shop..."
                  value={analysisSearch}
                  onChange={(e) => setAnalysisSearch(e.target.value)}
                />
              </div>
              <div className="text-sm text-gray-600 ml-auto">
                Analyzing <strong>{filteredAnalysis.length}</strong> segments
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Product & Shop</th>
                    <th className="px-4 py-3">Region</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Sales</th>
                    <th className="px-4 py-3">Restocks</th>
                    <th className="px-4 py-3">Turnover</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAnalysis.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.productName}
                            className="w-10 h-10 object-cover rounded border border-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                            <Package size={16} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-800">
                          {item.productName}
                        </span>
                        <br />
                        <small className="text-gray-500">
                          at {item.shopName}
                        </small>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {item.region}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block ${item.currentStock < 20 ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full inline-block bg-green-100 text-green-800">
                          {item.totalSales}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full inline-block bg-blue-100 text-blue-800">
                          {item.totalRestocks}
                        </span>
                      </td>
                      <td>
                        <strong>{(item.turnoverRate * 100).toFixed(0)}%</strong>
                      </td>
                      <td className="px-4 py-3">
                        {item.turnoverRate > 0.5 ? (
                          <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-800">
                            <ArrowUpRight size={14} /> High
                          </div>
                        ) : item.turnoverRate > 0.2 ? (
                          <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            <Activity size={14} /> Stable
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-800">
                            <ArrowDownRight size={14} /> Low
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredAnalysis.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-8 text-gray-500"
                      >
                        No performance data matches your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "sales" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Sales Ledger
            </h2>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <ShoppingCart size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Total Units Sold</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {stockLogs
                      .filter((l) => l.change_amount < 0)
                      .reduce((acc, l) => acc + Math.abs(l.change_amount), 0)}
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <CreditCard size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">M-Pesa Volume</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {stockLogs
                      .filter(
                        (l) =>
                          l.change_amount < 0 && l.payment_method === "mpesa",
                      )
                      .reduce((acc, l) => acc + Math.abs(l.change_amount), 0)}
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <Coins size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Cash Volume</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {stockLogs
                      .filter(
                        (l) =>
                          l.change_amount < 0 && l.payment_method === "cash",
                      )
                      .reduce((acc, l) => acc + Math.abs(l.change_amount), 0)}
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-5">
                <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                  <TrendingUp size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Avg Basket Size</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {(
                      stockLogs.filter((l) => l.change_amount < 0).length > 0
                        ? stockLogs
                            .filter((l) => l.change_amount < 0)
                            .reduce(
                              (acc, l) => acc + Math.abs(l.change_amount),
                              0,
                            ) /
                          stockLogs.filter((l) => l.change_amount < 0).length
                        : 0
                    ).toFixed(1)}
                  </span>
                </div>
              </div>
            </section>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4">Partner</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stockLogs
                    .filter((log) => log.change_amount < 0)
                    .map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {log.product.image_url ? (
                              <img
                                src={log.product.image_url}
                                className="w-8 h-8 rounded object-cover"
                                alt=""
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                                <Package size={14} />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-800">
                                {log.product.name}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {log.product.barcode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700">
                          {log.user.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full font-bold text-xs">
                            {Math.abs(log.change_amount)} Units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`flex items-center gap-1.5 text-xs font-bold uppercase ${log.payment_method === "mpesa" ? "text-green-600" : "text-blue-600"}`}
                          >
                            {log.payment_method === "mpesa" ? (
                              <CreditCard size={14} />
                            ) : (
                              <Coins size={14} />
                            )}
                            {log.payment_method || "Cash"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded-full font-bold">
                            {log.reason}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "pos" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Terminal POS
            </h2>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <ScanLine size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Quick Checkout
                  </h3>
                  <p className="text-gray-500">
                    Process manual sales for partner shops
                  </p>
                </div>
              </div>

              <form onSubmit={handlePOSSale} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Target Enterprise
                    </label>
                    <select
                      value={posTargetUserId}
                      onChange={(e) => setPosTargetUserId(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      required
                    >
                      <option value="">Select Partner Shop...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.region})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Product Barcode
                    </label>
                    <div className="relative">
                      <ScanLine
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Scan or type barcode"
                        value={posBarcode}
                        onChange={(e) => setPosBarcode(e.target.value)}
                        className="w-full pl-10 pr-4 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Quantity
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setPosQuantity(Math.max(1, posQuantity - 1))
                        }
                        className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        <ChevronDown size={20} />
                      </button>
                      <input
                        type="number"
                        value={posQuantity}
                        onChange={(e) =>
                          setPosQuantity(parseInt(e.target.value) || 1)
                        }
                        className="w-full text-center p-3 border border-gray-300 rounded-xl font-bold text-xl outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setPosQuantity(posQuantity + 1)}
                        className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        <ChevronUp size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPosPaymentMethod("cash")}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${posPaymentMethod === "cash" ? "border-indigo-600 bg-indigo-50 text-indigo-600 font-bold" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                      >
                        <Coins size={20} /> Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosPaymentMethod("mpesa")}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${posPaymentMethod === "mpesa" ? "border-green-600 bg-green-50 text-green-600 font-bold" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                      >
                        <CreditCard size={20} /> M-Pesa
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingSale}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isProcessingSale ? (
                    <RefreshCw className="animate-spin" />
                  ) : (
                    <CheckCircle2 />
                  )}
                  {isProcessingSale ? "Processing..." : "Complete Transaction"}
                </button>

                {posMessage.text && (
                  <div
                    className={`p-4 rounded-xl flex items-center gap-3 ${posMessage.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    {posMessage.type === "success" ? (
                      <CheckCircle2 />
                    ) : (
                      <AlertCircle />
                    )}
                    <span className="font-medium">{posMessage.text}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
