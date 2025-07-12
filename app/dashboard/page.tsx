"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  Building2,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  MessageSquare,
  LogOut,
  TrendingDown,
  Gauge,
  Sparkles,
  Database,
  Zap,
  Star,
  Crown,
  Award,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface CostStatistics {
  average_cost: number;
  min_cost: number;
  max_cost: number;
}

interface DepartmentCostStat {
  _id: string;
  total_cost: number;
  count: number;
  valid_cost_count: number;
}

interface DashboardStats {
  total_resources: number;
  total_cost: number;
  valid_cost_count: number;
  excluded_from_cost: number;
  cost_statistics: CostStatistics;
  department_stats: Array<{ _id: string; count: number }>;
  parent_department_stats: Array<{ _id: string; count: number }>;
  department_cost_stats: Array<DepartmentCostStat>;
  category_stats: Array<{ _id: string; count: number }>;
  section_stats: Array<{ _id: string; count: number }>;
}

interface RecentResource {
  _id: string;
  sl_no: string;
  description: string;
  department: string;
  parent_department?: string;
  cost: number;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentResources, setRecentResources] = useState<RecentResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://campus-back-production.up.railway.app";

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    // Get user info from token
    try {
      const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
      setUser(userInfo);
    } catch (error) {
      console.error("Error parsing user info:", error);
    }

    fetchDashboardData();
  }, [router]);

  const sanitizeNumber = (value: any): number => {
    if (typeof value === "number" && isFinite(value) && !isNaN(value)) {
      return value;
    }
    return 0;
  };

  const sanitizeStats = (stats: any): DashboardStats => {
    if (!stats) return stats;

    return {
      ...stats,
      total_cost: sanitizeNumber(stats.total_cost),
      valid_cost_count: sanitizeNumber(stats.valid_cost_count),
      excluded_from_cost: sanitizeNumber(stats.excluded_from_cost),
      cost_statistics: {
        average_cost: sanitizeNumber(stats.cost_statistics?.average_cost),
        min_cost: sanitizeNumber(stats.cost_statistics?.min_cost),
        max_cost: sanitizeNumber(stats.cost_statistics?.max_cost),
      },
      department_cost_stats: (stats.department_cost_stats || []).map(
        (dept: any) => ({
          ...dept,
          total_cost: sanitizeNumber(dept.total_cost),
          count: sanitizeNumber(dept.count),
          valid_cost_count: sanitizeNumber(dept.valid_cost_count),
        })
      ),
      parent_department_stats: (stats.parent_department_stats || []).map(
        (dept: any) => ({
          ...dept,
          count: sanitizeNumber(dept.count),
        })
      ),
    };
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("session_token");

      // Fetch dashboard statistics
      const statsResponse = await fetch(`${BACKEND_URL}/api/resources/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(sanitizeStats(statsData.data));
      } else {
        console.error("Failed to fetch stats:", await statsResponse.text());
      }

      // Fetch recent resources
      const recentResponse = await fetch(
        `${BACKEND_URL}/api/resources?page=1&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentResources(recentData.data.resources || []);
      } else {
        console.error(
          "Failed to fetch recent resources:",
          await recentResponse.text()
        );
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("session_token");
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("session_token");
      localStorage.removeItem("user_info");
      router.push("/auth/login");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getValidCostPercentage = () => {
    if (!stats || stats.total_resources === 0) return 0;
    return Math.round((stats.valid_cost_count / stats.total_resources) * 100);
  };

  const getDataQualityColor = (percentage: number) => {
    if (percentage >= 90) return "bg-emerald-500";
    if (percentage >= 70) return "bg-amber-500";
    return "bg-red-500";
  };

  // Enhanced Loading Component
  const DashboardLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Outer rotating ring */}
        <motion.div
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="w-40 h-40 border-8 border-transparent border-t-blue-500 border-r-purple-500 rounded-full"
        />

        {/* Middle rotating ring */}
        <motion.div
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="absolute inset-4 w-32 h-32 border-6 border-transparent border-b-indigo-500 border-l-pink-500 rounded-full"
        />

        {/* Inner pulsing circle */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            scale: { duration: 2, repeat: Number.POSITIVE_INFINITY },
            rotate: {
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            },
          }}
          className="absolute inset-8 w-24 h-24 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl"
        >
          <motion.div
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          >
            <Database className="h-12 w-12 text-white" />
          </motion.div>
        </motion.div>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.3,
            }}
            className={`absolute w-3 h-3 rounded-full bg-gradient-to-r ${
              i % 3 === 0
                ? "from-blue-400 to-blue-600"
                : i % 3 === 1
                ? "from-purple-400 to-purple-600"
                : "from-pink-400 to-pink-600"
            }`}
            style={{
              top: `${20 + i * 10}%`,
              left: `${10 + i * 15}%`,
            }}
          />
        ))}

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center"
        >
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Loading Dashboard
          </h3>
          <div className="flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 0.8,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );

  if (isLoading) {
    return <DashboardLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Enhanced Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden border-b bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-lg"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full"
        />

        <div className="container mx-auto px-4 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative p-3 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl"
            >
              <motion.div
                transition={{
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-2xl"
              />
              <Building2 className="h-8 w-8 text-white relative z-10" />
            </motion.div>
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
              >
                Campus Assets
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-gray-500 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
                Advanced Dashboard
              </motion.p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 px-4 py-2 text-sm">
                <Crown className="h-4 w-4 mr-2" />
                Welcome, {user?.name || user?.email || "Admin"}
              </Badge>
            </motion.div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"
          />

          <div className="relative z-10">
            <motion.h2
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="text-4xl font-bold mb-2 flex items-center gap-3"
            >
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                👋
              </motion.span>
              Welcome back, {user?.name || "Admin"}!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="text-indigo-100 text-lg"
            >
              Here's what's happening with your campus assets today.
            </motion.p>
          </div>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
              <motion.div
                transition={{
                  duration: 10,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium opacity-90">
                  Total Assets
                </CardTitle>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Package className="h-5 w-5 opacity-90" />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                  className="text-3xl font-bold mb-2"
                >
                  {stats?.total_resources || 0}
                </motion.div>
                <p className="text-xs opacity-80 flex items-center">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {getValidCostPercentage()}% with valid cost data
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white overflow-hidden relative">
              <motion.div
                transition={{
                  duration: 12,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium opacity-90">
                  Total Value
                </CardTitle>
                <motion.div
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <DollarSign className="h-5 w-5 opacity-90" />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9, type: "spring" }}
                  className="text-3xl font-bold mb-2"
                >
                  {formatCurrency(stats?.total_cost || 0)}
                </motion.div>
                <p className="text-xs opacity-80 flex items-center">
                  <ArrowUpRight className="h-3 w-3 inline mr-1" />
                  {stats?.valid_cost_count || 0} items valued
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white overflow-hidden relative">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium opacity-90">
                  Departments
                </CardTitle>
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Users className="h-5 w-5 opacity-90" />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.0, type: "spring" }}
                  className="text-3xl font-bold mb-2"
                >
                  {stats?.department_stats?.length || 0}
                </motion.div>
                <p className="text-xs opacity-80 flex items-center">
                  <Activity className="h-3 w-3 inline mr-1" />
                  Active departments
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-500 text-white overflow-hidden relative">
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{
                  rotate: {
                    duration: 8,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  },
                  scale: { duration: 3, repeat: Number.POSITIVE_INFINITY },
                }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium opacity-90">
                  Avg. Asset Value
                </CardTitle>
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <TrendingUp className="h-5 w-5 opacity-90" />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.1, type: "spring" }}
                  className="text-3xl font-bold mb-2"
                >
                  {formatCurrency(stats?.cost_statistics?.average_cost || 0)}
                </motion.div>
                <p className="text-xs opacity-80 flex items-center">
                  <ArrowDownRight className="h-3 w-3 inline mr-1" />
                  Per asset average
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Cost Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white overflow-hidden relative">
              <motion.div
                transition={{
                  duration: 15,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full"
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Highest Value Asset
                </CardTitle>
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <TrendingUp className="h-5 w-5 opacity-90" />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2, type: "spring" }}
                  className="text-3xl font-bold mb-2"
                >
                  {formatCurrency(stats?.cost_statistics?.max_cost || 0)}
                </motion.div>
                <p className="text-xs opacity-80">Maximum asset value</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white overflow-hidden relative">
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
                className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full"
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium opacity-90">
                  Lowest Value Asset
                </CardTitle>
                <motion.div
                  transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                >
                  <TrendingDown className="h-5 w-5 opacity-90" />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.3, type: "spring" }}
                  className="text-3xl font-bold mb-2"
                >
                  {formatCurrency(stats?.cost_statistics?.min_cost || 0)}
                </motion.div>
                <p className="text-xs opacity-80">Minimum asset value</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative">
              <motion.div
                transition={{
                  duration: 10,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="absolute top-1/2 right-0 w-16 h-16 bg-white/10 rounded-full"
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Data Quality
                </CardTitle>
                <motion.div
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <Gauge className="h-5 w-5 opacity-90" />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.4, type: "spring" }}
                  className="text-3xl font-bold mb-2"
                >
                  {getValidCostPercentage()}%
                </motion.div>
                <p className="text-xs opacity-80">
                  {stats?.excluded_from_cost || 0} items missing cost data
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Charts and Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Enhanced Department Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <motion.div
                    transition={{
                      duration: 4,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <BarChart3 className="h-6 w-6" />
                  </motion.div>
                  Assets by Department
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Distribution of assets across departments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {stats?.department_stats?.slice(0, 6).map((dept, index) => {
                    const percentage = (
                      (dept.count / (stats?.total_resources || 1)) *
                      100
                    ).toFixed(1);
                    const gradients = [
                      "from-blue-500 to-blue-600",
                      "from-green-500 to-emerald-600",
                      "from-purple-500 to-violet-600",
                      "from-orange-500 to-red-500",
                      "from-pink-500 to-rose-600",
                      "from-teal-500 to-cyan-600",
                    ];

                    return (
                      <motion.div
                        key={dept._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + index * 0.1 }}
                        className="relative"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{
                                duration: 2,
                                repeat: Number.POSITIVE_INFINITY,
                                delay: index * 0.2,
                              }}
                              className={`w-4 h-4 rounded-full bg-gradient-to-r ${gradients[index]} shadow-lg`}
                            />
                            <span className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">
                              {dept._id || "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 font-medium">
                              {percentage}%
                            </span>
                            <span className="text-lg font-bold text-gray-900 min-w-[40px] text-right">
                              {dept.count}
                            </span>
                          </div>
                        </div>

                        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{
                              delay: 1.5 + index * 0.1,
                              duration: 1,
                              ease: "easeOut",
                            }}
                            className={`h-full bg-gradient-to-r ${gradients[index]} rounded-full relative overflow-hidden`}
                          >
                            <motion.div
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{
                                duration: 2,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "linear",
                              }}
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            />
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced Department Value Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <motion.div
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <DollarSign className="h-6 w-6" />
                  </motion.div>
                  Asset Value by Department
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  Total asset value across departments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {stats?.department_cost_stats
                    ?.filter((dept) => dept.total_cost > 0)
                    .slice(0, 6)
                    .map((dept, index) => {
                      const percentage = (
                        (dept.total_cost / (stats?.total_cost || 1)) *
                        100
                      ).toFixed(1);
                      const gradients = [
                        "from-emerald-500 to-green-600",
                        "from-teal-500 to-cyan-600",
                        "from-blue-500 to-indigo-600",
                        "from-purple-500 to-violet-600",
                        "from-pink-500 to-rose-600",
                        "from-orange-500 to-red-500",
                      ];

                      return (
                        <motion.div
                          key={dept._id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.3 + index * 0.1 }}
                          className="relative"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <motion.div
                                animate={{
                                  scale: [1, 1.3, 1],
                                  rotate: [0, 180, 360],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Number.POSITIVE_INFINITY,
                                  delay: index * 0.3,
                                }}
                                className={`w-4 h-4 rounded-full bg-gradient-to-r ${gradients[index]} shadow-lg`}
                              />
                              <span className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">
                                {dept._id || "Unknown"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 font-medium">
                                {percentage}%
                              </span>
                              <span className="text-sm font-bold text-gray-900 min-w-[80px] text-right">
                                {formatCurrency(dept.total_cost).replace(
                                  "₹",
                                  "₹"
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{
                                delay: 1.6 + index * 0.1,
                                duration: 1.2,
                                ease: "easeOut",
                              }}
                              className={`h-full bg-gradient-to-r ${gradients[index]} rounded-full relative overflow-hidden`}
                            >
                              <motion.div
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{
                                  duration: 2.5,
                                  repeat: Number.POSITIVE_INFINITY,
                                  ease: "linear",
                                  delay: index * 0.2,
                                }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                              />
                            </motion.div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Recent Assets and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enhanced Recent Assets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <motion.div
                    transition={{
                      duration: 5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <Calendar className="h-6 w-6" />
                  </motion.div>
                  Recent Assets
                </CardTitle>
                <CardDescription className="text-purple-100">
                  Latest additions to your inventory
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <AnimatePresence>
                    {recentResources.map((resource, index) => (
                      <motion.div
                        key={resource._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: 1.4 + index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl hover:from-blue-50 hover:to-purple-50 transition-all duration-300 shadow-md hover:shadow-lg border border-gray-100"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 truncate mb-2">
                            {resource.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 text-xs">
                              {resource.department}
                            </Badge>
                            {resource.parent_department && (
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 text-xs">
                                {resource.parent_department}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {formatCurrency(resource.cost)}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {formatDate(resource.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {recentResources.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      >
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No recent assets found
                      </h3>
                      <p className="text-gray-500">
                        Start adding assets to see them here
                      </p>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      rotate: {
                        duration: 4,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      },
                      scale: { duration: 2, repeat: Number.POSITIVE_INFINITY },
                    }}
                  >
                    <Zap className="h-6 w-6" />
                  </motion.div>
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-orange-100">
                  Manage your assets efficiently
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/resources">
                    <Button className="w-full justify-start bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl h-12 shadow-lg hover:shadow-xl transition-all duration-300">
                      <Package className="h-5 w-5 mr-3" />
                      View All Assets
                    </Button>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.6 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/dashboard/files">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-2 border-green-200 hover:bg-green-50 bg-transparent rounded-2xl h-12 hover:border-green-400 transition-all duration-300"
                    >
                      <FileText className="h-5 w-5 mr-3 text-green-600" />
                      Import/Export Data
                    </Button>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.7 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/dashboard/ai">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-2 border-purple-200 hover:bg-purple-50 bg-transparent rounded-2xl h-12 hover:border-purple-400 transition-all duration-300"
                    >
                      <MessageSquare className="h-5 w-5 mr-3 text-purple-600" />
                      AI Assistant
                    </Button>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8 }}
                  className="pt-6 border-t border-gray-200"
                >
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span className="font-medium">Data Quality Score</span>
                    <span className="font-bold">
                      {getValidCostPercentage()}%
                    </span>
                  </div>
                  <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getValidCostPercentage()}%` }}
                      transition={{ delay: 2, duration: 1.5, ease: "easeOut" }}
                      className={`h-3 rounded-full ${getDataQualityColor(
                        getValidCostPercentage()
                      )} relative overflow-hidden`}
                    >
                      <motion.div
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      />
                    </motion.div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {stats?.excluded_from_cost || 0} assets need cost data
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
