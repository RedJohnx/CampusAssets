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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  IndianRupee,
  Package,
  TrendingUp,
  MapPin,
  Users,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  total_resources: number;
  total_cost: number;
  recent_additions: number;
  location_stats: Array<{ _id: string; count: number }>;
  department_stats: Array<{ _id: string; count: number }>;
}

const COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
  "#F97316",
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    fetchDashboardStats(token);
  }, [router]);

  const fetchDashboardStats = async (token: string) => {
    try {
      const response = await fetch(
        "https://znlm131v-5000.inc1.devtunnels.ms/api/dashboard/stats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      } else if (response.status === 401) {
        localStorage.removeItem("session_token");
        localStorage.removeItem("user_data");
        router.push("/auth/login");
      } else {
        setError("Failed to fetch dashboard data");
      }
    } catch (error) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2 rounded-full" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl">
            <CardHeader>
              <Skeleton className="h-6 w-32 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </CardContent>
          </Card>
          <Card className="rounded-3xl">
            <CardHeader>
              <Skeleton className="h-6 w-32 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-3xl border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p className="font-medium">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-blue-100">
          Welcome back! Here's what's happening with your campus assets.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Total Resources
            </CardTitle>
            <div className="p-2 bg-blue-500 rounded-2xl">
              <Package className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {stats?.total_resources || 0}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Assets under management
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 bg-gradient-to-br from-green-50 to-green-100 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Total Value
            </CardTitle>
            <div className="p-2 bg-green-500 rounded-2xl">
              <IndianRupee className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              ₹{stats?.total_cost?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-green-600 mt-1">Combined asset value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Recent Additions
            </CardTitle>
            <div className="p-2 bg-purple-500 rounded-2xl">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {stats?.recent_additions || 0}
            </div>
            <p className="text-xs text-purple-600 mt-1">Added in last 7 days</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              Locations
            </CardTitle>
            <div className="p-2 bg-orange-500 rounded-2xl">
              <MapPin className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">
              {stats?.location_stats?.length || 0}
            </div>
            <p className="text-xs text-orange-600 mt-1">Active locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <BarChart className="mr-3 h-6 w-6 text-blue-600" />
              Resources by Location
            </CardTitle>
            <CardDescription>
              Distribution of assets across locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats?.location_stats || []}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="url(#blueGradient)"
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Activity className="mr-3 h-6 w-6 text-purple-600" />
              Resources by Department
            </CardTitle>
            <CardDescription>
              Asset distribution across departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.department_stats || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ _id, percent }) =>
                    `${_id} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(stats?.department_stats || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="rounded-3xl border-0 shadow-xl bg-gradient-to-br from-gray-50 to-gray-100">
        <CardHeader>
          <CardTitle className="text-2xl">Quick Overview</CardTitle>
          <CardDescription>Key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-md">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Top Location
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.location_stats?.[0]?._id || "N/A"}
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.location_stats?.[0]?.count || 0} resources
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-md">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Top Department
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.department_stats?.[0]?._id || "N/A"}
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.department_stats?.[0]?.count || 0} resources
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-md">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl">
                <IndianRupee className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg. Asset Value
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹
                  {stats?.total_resources && stats?.total_cost
                    ? Math.round(
                        stats.total_cost / stats.total_resources
                      ).toLocaleString()
                    : 0}
                </p>
                <p className="text-xs text-gray-500">Per resource</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
