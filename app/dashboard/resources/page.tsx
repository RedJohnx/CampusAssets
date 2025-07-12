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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Package,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Hash,
  Tag,
  FileText,
  Users,
  Database,
  Activity,
  Settings,
  RefreshCw,
  MoreHorizontal,
  X,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Resource {
  _id: string;
  sl_no: string;
  description: string;
  service_tag: string;
  identification_number: string;
  procurement_date: string;
  cost: number;
  location: string;
  department: string;
  parent_department: string;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    department: "",
    parent_department: "",
    cost_min: "",
    cost_max: "",
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const [formData, setFormData] = useState({
    sl_no: "",
    description: "",
    service_tag: "",
    identification_number: "",
    procurement_date: "",
    cost: "",
    location: "",
    department: "",
    parent_department: "",
  });

  const [locations, setLocations] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [parentDepartments, setParentDepartments] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://znlm131v-5000.inc1.devtunnels.ms";

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    const userData = localStorage.getItem("user_info");

    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    fetchFilterOptions(token);
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (token) {
      fetchResources(token);
    }
  }, [pagination.page, searchTerm, filters]);

  const fetchFilterOptions = async (token: string) => {
    try {
      const [locRes, deptRes, parentDeptRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/parent-departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (locRes.ok) {
        const locData = await locRes.json();
        setLocations(locData.data || []);
      }
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData.data || []);
      }
      if (parentDeptRes.ok) {
        const parentDeptData = await parentDeptRes.json();
        setParentDepartments(parentDeptData.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch filter options", error);
    }
  };

  const fetchResources = async (token: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (filters.location) params.append("location", filters.location);
      if (filters.department) params.append("department", filters.department);
      if (filters.parent_department)
        params.append("parent_department", filters.parent_department);
      if (filters.cost_min) params.append("cost_min", filters.cost_min);
      if (filters.cost_max) params.append("cost_max", filters.cost_max);

      const response = await fetch(`${BACKEND_URL}/api/resources?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data.data.resources || []);
        setPagination(data.data.pagination || pagination);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch resources",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("session_token");
      const response = await fetch(`${BACKEND_URL}/api/resources`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          cost: Number.parseFloat(formData.cost) || 0,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success! 🎉",
          description: "Resource created successfully",
        });
        setShowCreateDialog(false);
        resetForm();
        fetchResources(token!);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create resource",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedResource || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("session_token");
      const response = await fetch(
        `${BACKEND_URL}/api/resources/${selectedResource._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            cost: Number.parseFloat(formData.cost) || 0,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success! ✨",
          description: "Resource updated successfully",
        });
        setShowEditDialog(false);
        resetForm();
        fetchResources(token!);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update resource",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedResource) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("session_token");
      const response = await fetch(
        `${BACKEND_URL}/api/resources/${selectedResource._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast({
          title: "Success! 🗑️",
          description: "Resource deleted successfully",
        });
        setShowDeleteDialog(false);
        setSelectedResource(null);
        fetchResources(token!);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete resource",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      sl_no: "",
      description: "",
      service_tag: "",
      identification_number: "",
      procurement_date: "",
      cost: "",
      location: "",
      department: "",
      parent_department: "",
    });
    setSelectedResource(null);
  };

  const openEditDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setFormData({
      sl_no: resource.sl_no || "",
      description: resource.description || "",
      service_tag: resource.service_tag || "",
      identification_number: resource.identification_number || "",
      procurement_date: resource.procurement_date
        ? resource.procurement_date.split("T")[0]
        : "",
      cost: resource.cost?.toString() || "",
      location: resource.location || "",
      department: resource.department || "",
      parent_department: resource.parent_department || "",
    });
    setShowEditDialog(true);
  };

  const openViewDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setShowViewDialog(true);
  };

  const openDeleteDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setShowDeleteDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const clearFilters = () => {
    setFilters({
      location: "",
      department: "",
      parent_department: "",
      cost_min: "",
      cost_max: "",
    });
    setSearchTerm("");
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (isLoading && resources.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="w-32 h-32 border-8 border-purple-200 border-t-purple-600 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="absolute inset-4 w-24 h-24 border-6 border-pink-200 border-b-pink-600 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="absolute inset-8 w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center"
          >
            <Database className="h-8 w-8 text-white" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl"
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
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <motion.div
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"
                >
                  <Package className="h-10 w-10" />
                </motion.div>
                <div>
                  <h1 className="text-4xl font-bold mb-2">
                    Resource Management
                  </h1>
                  <p className="text-indigo-100 text-lg">
                    Comprehensive asset tracking and management system
                  </p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="text-right"
              >
                <div className="text-3xl font-bold">{pagination.total}</div>
                <div className="text-indigo-200">Total Assets</div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3 mt-6"
            >
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                <Database className="h-4 w-4 mr-2" />
                Advanced Search
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                <Activity className="h-4 w-4 mr-2" />
                Real-time Updates
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                <Settings className="h-4 w-4 mr-2" />
                Smart Filtering
              </Badge>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="rounded-3xl border-0 shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search resources by description, service tag, location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 pl-12 pr-4 rounded-2xl border-2 focus:border-purple-500 transition-all duration-300"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => setShowFilters(!showFilters)}
                      variant="outline"
                      className="h-12 px-6 rounded-2xl border-2 hover:border-purple-500 transition-all duration-300"
                    >
                      <Filter className="h-5 w-5 mr-2" />
                      Filters
                      {Object.values(filters).some((f) => f) && (
                        <Badge className="ml-2 bg-purple-100 text-purple-700">
                          Active
                        </Badge>
                      )}
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => {
                        resetForm();
                        setShowCreateDialog(true);
                      }}
                      className="h-12 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Resource
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() =>
                        fetchResources(localStorage.getItem("session_token")!)
                      }
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-2xl border-2 hover:border-green-500 transition-all duration-300"
                    >
                      <RefreshCw
                        className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Enhanced Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 pt-6 border-t border-gray-200"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Location
                        </Label>
                        <Select
                          value={filters.location}
                          onValueChange={(value) =>
                            setFilters({
                              ...filters,
                              location: value === "all" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="All locations" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All locations</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location} value={location}>
                                {location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Department
                        </Label>
                        <Select
                          value={filters.department}
                          onValueChange={(value) =>
                            setFilters({
                              ...filters,
                              department: value === "all" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="All departments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All departments</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Parent Department
                        </Label>
                        <Select
                          value={filters.parent_department}
                          onValueChange={(value) =>
                            setFilters({
                              ...filters,
                              parent_department: value === "all" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="All parent depts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              All parent departments
                            </SelectItem>
                            {parentDepartments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Min Cost
                        </Label>
                        <Input
                          type="number"
                          placeholder="₹0"
                          value={filters.cost_min}
                          onChange={(e) =>
                            setFilters({ ...filters, cost_min: e.target.value })
                          }
                          className="h-10 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Max Cost
                        </Label>
                        <Input
                          type="number"
                          placeholder="₹∞"
                          value={filters.cost_max}
                          onChange={(e) =>
                            setFilters({ ...filters, cost_max: e.target.value })
                          }
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={clearFilters}
                        variant="outline"
                        size="sm"
                        className="rounded-xl bg-transparent"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="rounded-3xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Database className="h-7 w-7" />
                    Resources Database
                  </CardTitle>
                  <CardDescription className="text-slate-300 mt-2">
                    {pagination.total} total resources • Page {pagination.page}{" "}
                    of {pagination.pages}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <Activity className="h-4 w-4 mr-1" />
                    Live Data
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 py-4">
                        SL No
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Description
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Service Tag
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Cost
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Location
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Department
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {resources.map((resource, index) => (
                        <motion.tr
                          key={resource._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300"
                        >
                          <TableCell className="font-medium py-4">
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {resource.sl_no || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                              {resource.description}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              ID: {resource.identification_number || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {resource.service_tag || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-lg text-green-600">
                              {formatCurrency(resource.cost)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">
                                {resource.location || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge
                                variant="outline"
                                className="bg-purple-50 text-purple-700 border-purple-200"
                              >
                                <Building className="h-3 w-3 mr-1" />
                                {resource.department || "N/A"}
                              </Badge>
                              {resource.parent_department && (
                                <div className="text-xs text-gray-500">
                                  Parent: {resource.parent_department}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-2xl shadow-xl border-0 bg-white/95 backdrop-blur-xl"
                              >
                                <DropdownMenuItem
                                  onClick={() => openViewDialog(resource)}
                                  className="rounded-xl cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2 text-blue-600" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(resource)}
                                  className="rounded-xl cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2 text-green-600" />
                                  Edit Resource
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(resource)}
                                  className="rounded-xl cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Resource
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>

                {resources.length === 0 && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">
                      No resources found
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Try adjusting your search or filters
                    </p>
                    <Button
                      onClick={() => {
                        resetForm();
                        setShowCreateDialog(true);
                      }}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Resource
                    </Button>
                  </motion.div>
                )}
              </div>
            </CardContent>

            {/* Enhanced Pagination */}
            {pagination.pages > 1 && (
              <div className="p-6 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{" "}
                    of {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, pagination.pages) },
                        (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              variant={
                                pagination.page === page ? "default" : "outline"
                              }
                              size="sm"
                              className="w-10 h-10 rounded-xl"
                            >
                              {page}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <Plus className="h-8 w-8 text-green-600" />
                </motion.div>
                Create New Resource
              </DialogTitle>
              <DialogDescription>
                Add a new resource to your inventory with detailed information
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="sl_no">Serial Number</Label>
                <Input
                  id="sl_no"
                  value={formData.sl_no}
                  onChange={(e) =>
                    setFormData({ ...formData, sl_no: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_tag">Service Tag</Label>
                <Input
                  id="service_tag"
                  value={formData.service_tag}
                  onChange={(e) =>
                    setFormData({ ...formData, service_tag: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="rounded-xl"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="identification_number">ID Number</Label>
                <Input
                  id="identification_number"
                  value={formData.identification_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      identification_number: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Cost (₹)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="procurement_date">Procurement Date</Label>
                <Input
                  id="procurement_date"
                  type="date"
                  value={formData.procurement_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      procurement_date: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_department">Parent Department</Label>
                <Input
                  id="parent_department"
                  value={formData.parent_department}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parent_department: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Resource
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Edit className="h-8 w-8 text-blue-600" />
                </motion.div>
                Edit Resource
              </DialogTitle>
              <DialogDescription>
                Update the resource information below
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="edit_sl_no">Serial Number</Label>
                <Input
                  id="edit_sl_no"
                  value={formData.sl_no}
                  onChange={(e) =>
                    setFormData({ ...formData, sl_no: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_service_tag">Service Tag</Label>
                <Input
                  id="edit_service_tag"
                  value={formData.service_tag}
                  onChange={(e) =>
                    setFormData({ ...formData, service_tag: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit_description">Description *</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="rounded-xl"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_identification_number">ID Number</Label>
                <Input
                  id="edit_identification_number"
                  value={formData.identification_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      identification_number: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_cost">Cost (₹)</Label>
                <Input
                  id="edit_cost"
                  type="number"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_procurement_date">Procurement Date</Label>
                <Input
                  id="edit_procurement_date"
                  type="date"
                  value={formData.procurement_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      procurement_date: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_location">Location</Label>
                <Input
                  id="edit_location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_department">Department</Label>
                <Input
                  id="edit_department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_parent_department">
                  Parent Department
                </Label>
                <Input
                  id="edit_parent_department"
                  value={formData.parent_department}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parent_department: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setShowEditDialog(false)}
                variant="outline"
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Update Resource
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Eye className="h-8 w-8 text-purple-600" />
                </motion.div>
                Resource Details
              </DialogTitle>
              <DialogDescription>
                Complete information about this resource
              </DialogDescription>
            </DialogHeader>

            {selectedResource && (
              <div className="py-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-blue-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Serial Number
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-blue-900">
                      {selectedResource.sl_no || "N/A"}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Service Tag
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-green-900">
                      {selectedResource.service_tag || "N/A"}
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-2xl md:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">
                        Description
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-purple-900">
                      {selectedResource.description}
                    </p>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">
                        Cost
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-orange-900">
                      {formatCurrency(selectedResource.cost)}
                    </p>
                  </div>

                  <div className="p-4 bg-pink-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-pink-600" />
                      <span className="text-sm font-medium text-pink-800">
                        Procurement Date
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-pink-900">
                      {formatDate(selectedResource.procurement_date)}
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-800">
                        Location
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-indigo-900">
                      {selectedResource.location || "N/A"}
                    </p>
                  </div>

                  <div className="p-4 bg-teal-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-medium text-teal-800">
                        Department
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-teal-900">
                      {selectedResource.department || "N/A"}
                    </p>
                  </div>

                  <div className="p-4 bg-cyan-50 rounded-2xl md:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-cyan-600" />
                      <span className="text-sm font-medium text-cyan-800">
                        Parent Department
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-cyan-900">
                      {selectedResource.parent_department || "N/A"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {formatDate(selectedResource.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>{" "}
                    {formatDate(selectedResource.updated_at)}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={() => setShowViewDialog(false)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3 text-red-600">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{
                    duration: 0.5,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                >
                  <Trash2 className="h-8 w-8" />
                </motion.div>
                Delete Resource
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this resource? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {selectedResource && (
              <div className="py-4">
                <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
                  <p className="font-semibold text-red-900">
                    {selectedResource.description}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Service Tag: {selectedResource.service_tag || "N/A"}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={() => setShowDeleteDialog(false)}
                variant="outline"
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Resource
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
