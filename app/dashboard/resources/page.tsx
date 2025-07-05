"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  IndianRupee,
  Calendar,
  MapPin,
  Building,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    cost_min: "",
    cost_max: "",
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
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
  });
  const [locations, setLocations] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    const userData = localStorage.getItem("user_data");

    if (!token || !userData) {
      router.push("/auth/login");
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (error) {
      router.push("/auth/login");
      return;
    }

    fetchResources(token);
    fetchLocations(token);
    fetchDepartments(token);
  }, [router]);

  // Separate effect for pagination and filters
  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (token) {
      fetchResources(token);
    }
  }, [pagination.page, searchTerm, filters]);

  const fetchResources = async (token: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add search term
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      // Add filters only if they have values
      if (filters.location && filters.location !== "all") {
        params.append("location", filters.location);
      }
      if (filters.department && filters.department !== "all") {
        params.append("department", filters.department);
      }
      if (filters.cost_min) {
        params.append("cost_min", filters.cost_min);
      }
      if (filters.cost_max) {
        params.append("cost_max", filters.cost_max);
      }

      const response = await fetch(
        `https://znlm131v-5000.inc1.devtunnels.ms/api/resources?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResources(data.data.resources);
        setPagination(data.data.pagination);
      } else if (response.status === 401) {
        router.push("/auth/login");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch resources",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async (token: string) => {
    try {
      const response = await fetch(
        "https://znlm131v-5000.inc1.devtunnels.ms/api/locations",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setLocations(data.data);
      }
    } catch (error) {
      // Ignore error
    }
  };

  const fetchDepartments = async (token: string) => {
    try {
      const response = await fetch(
        "https://znlm131v-5000.inc1.devtunnels.ms/api/departments",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.data);
      }
    } catch (error) {
      // Ignore error
    }
  };

  const handleCreateResource = async () => {
    const token = localStorage.getItem("session_token");
    if (!token) return;

    try {
      const response = await fetch(
        "https://znlm131v-5000.inc1.devtunnels.ms/api/resources",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            cost: Number.parseFloat(formData.cost),
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success! 🎉",
          description: "Resource created successfully",
        });
        setShowCreateDialog(false);
        resetForm();
        fetchResources(token);
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to create resource",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error",
        variant: "destructive",
      });
    }
  };

  const handleUpdateResource = async () => {
    const token = localStorage.getItem("session_token");
    if (!token || !selectedResource) return;

    try {
      const response = await fetch(
        `https://znlm131v-5000.inc1.devtunnels.ms/api/resources/${selectedResource._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            cost: Number.parseFloat(formData.cost),
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success! ✨",
          description: "Resource updated successfully",
        });
        setShowEditDialog(false);
        setSelectedResource(null);
        resetForm();
        fetchResources(token);
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to update resource",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    const token = localStorage.getItem("session_token");
    if (!token) return;

    if (
      !confirm(
        "Are you sure you want to delete this resource? This action cannot be undone."
      )
    )
      return;

    try {
      const response = await fetch(
        `https://znlm131v-5000.inc1.devtunnels.ms/api/resources/${resourceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast({
          title: "Deleted! 🗑️",
          description: "Resource deleted successfully",
        });
        fetchResources(token);
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to delete resource",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error",
        variant: "destructive",
      });
    }
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
    });
  };

  const openEditDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setFormData({
      sl_no: resource.sl_no,
      description: resource.description,
      service_tag: resource.service_tag,
      identification_number: resource.identification_number,
      procurement_date: resource.procurement_date,
      cost: resource.cost.toString(),
      location: resource.location,
      department: resource.department,
    });
    setShowEditDialog(true);
  };

  const clearFilters = () => {
    setFilters({
      location: "",
      department: "",
      cost_min: "",
      cost_max: "",
    });
    setSearchTerm("");
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Resources</h1>
            <p className="text-blue-100">
              Manage your campus assets and resources
            </p>
          </div>
          {isAdmin && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-white text-blue-600 hover:bg-blue-50 rounded-2xl px-6 py-3 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    Create New Resource
                  </DialogTitle>
                  <DialogDescription>
                    Add a new resource to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sl_no">SL No</Label>
                    <Input
                      id="sl_no"
                      value={formData.sl_no}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sl_no: e.target.value,
                        }))
                      }
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_tag">Service Tag</Label>
                    <Input
                      id="service_tag"
                      value={formData.service_tag}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          service_tag: e.target.value,
                        }))
                      }
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="identification_number">
                      Identification Number
                    </Label>
                    <Input
                      id="identification_number"
                      value={formData.identification_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          identification_number: e.target.value,
                        }))
                      }
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="procurement_date">Procurement Date</Label>
                    <Input
                      id="procurement_date"
                      type="date"
                      value={formData.procurement_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          procurement_date: e.target.value,
                        }))
                      }
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost (₹)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          cost: e.target.value,
                        }))
                      }
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          department: e.target.value,
                        }))
                      }
                      className="rounded-2xl"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    className="rounded-2xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateResource}
                    className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    Create Resource
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-3xl border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Filter className="mr-3 h-6 w-6 text-blue-600" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-2xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-filter">Location</Label>
              <Select
                value={filters.location}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    location: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="h-12 rounded-2xl">
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
            <div className="space-y-2">
              <Label htmlFor="department-filter">Department</Label>
              <Select
                value={filters.department}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    department: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="h-12 rounded-2xl">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-min">Min Cost (₹)</Label>
              <Input
                id="cost-min"
                type="number"
                placeholder="0"
                value={filters.cost_min}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, cost_min: e.target.value }))
                }
                className="h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-max">Max Cost (₹)</Label>
              <Input
                id="cost-max"
                type="number"
                placeholder="∞"
                value={filters.cost_max}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, cost_max: e.target.value }))
                }
                className="h-12 rounded-2xl"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="rounded-2xl bg-transparent"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resources Table */}
      <Card className="rounded-3xl border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            Resources ({pagination.total})
          </CardTitle>
          <CardDescription>
            Showing {resources.length} of {pagination.total} resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-2xl overflow-hidden border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">SL No</TableHead>
                      <TableHead className="font-semibold">
                        Description
                      </TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">
                        Department
                      </TableHead>
                      <TableHead className="font-semibold">Cost</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((resource) => (
                      <TableRow
                        key={resource._id}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        <TableCell className="font-medium">
                          {resource.sl_no}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="truncate"
                            title={resource.description}
                          >
                            {resource.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="rounded-full bg-blue-50 text-blue-700 border-blue-200"
                          >
                            <MapPin className="mr-1 h-3 w-3" />
                            {resource.location}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-purple-50 text-purple-700"
                          >
                            <Building className="mr-1 h-3 w-3" />
                            {resource.department}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <IndianRupee className="h-4 w-4 mr-1 text-green-600" />
                            {resource.cost.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(
                              resource.procurement_date
                            ).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(resource)}
                                  className="rounded-xl hover:bg-green-50 text-green-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteResource(resource._id)
                                  }
                                  className="rounded-xl hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    className="rounded-2xl"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    className="rounded-2xl"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Resource</DialogTitle>
            <DialogDescription>
              Update the resource information
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="edit-sl_no">SL No</Label>
              <Input
                id="edit-sl_no"
                value={formData.sl_no}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sl_no: e.target.value }))
                }
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-service_tag">Service Tag</Label>
              <Input
                id="edit-service_tag"
                value={formData.service_tag}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    service_tag: e.target.value,
                  }))
                }
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-identification_number">
                Identification Number
              </Label>
              <Input
                id="edit-identification_number"
                value={formData.identification_number}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    identification_number: e.target.value,
                  }))
                }
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-procurement_date">Procurement Date</Label>
              <Input
                id="edit-procurement_date"
                type="date"
                value={formData.procurement_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    procurement_date: e.target.value,
                  }))
                }
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cost">Cost (₹)</Label>
              <Input
                id="edit-cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost: e.target.value }))
                }
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }))
                }
                className="rounded-2xl"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateResource}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600"
            >
              Update Resource
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
