import { useState, useEffect } from "react";
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
} from "lucide-react";

const API_BASE_URL = "https://bd2-0e8g.onrender.com/api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
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
  const [loading, setLoading] = useState(false);
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
      setAdminUser(response.data.user);
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
    setAdminUser(null);
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
        const [invRes, logsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/inventory`, config),
          axios.get(`${API_BASE_URL}/stock-logs`, config),
        ]);
        setInventory(invRes.data);
        setStockLogs(logsRes.data);
      } else if (activeTab === "inventory") {
        const response = await axios.get(
          `${API_BASE_URL}/inventory${userParam}`,
          config,
        );
        setInventory(response.data);
      } else if (activeTab === "logs") {
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
      await axios.post(`${API_BASE_URL}/products`, newProduct, {
        headers: getAuthHeader(),
      });
      setFormMessage({ type: "success", text: "Product registered!" });
      setNewProduct({ barcode: "", name: "", userId: "" });
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      setFormMessage({ type: "error", text: msg });
    } finally {
      setFormLoading(false);
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Activity
                </h3>
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Partner</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stockLogs.slice(0, 5).map((log) => (
                        <tr key={log.id}>
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
            <h2 className="text-2xl font-semibold text-gray-900">
              Partner Network
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Enterprise Name</th>
                    <th className="px-4 py-3">Communication</th>
                    <th className="px-4 py-3">Zone</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {user.name}
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-1.5 cursor-pointer text-blue-600 hover:underline"
                          onClick={() => {
                            setMapCenter([user.latitude, user.longitude]);
                            setMapRegionFilter("all");
                            setMapShopFilter(user.id.toString());
                            setActiveTab("map");
                          }}
                        >
                          <MapPin size={14} /> {user.region || "Default"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full inline-block bg-gray-100 text-gray-800">
                          {user._count.products} Items
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      </main>
    </div>
  );
}

export default App;
