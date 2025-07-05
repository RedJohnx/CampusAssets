"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Users,
  Shield,
  Sparkles,
  BarChart3,
  FileText,
  MessageSquare,
  Upload,
  Zap,
  Globe,
} from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("session_token")
    if (token) {
      router.push("/dashboard")
    } else {
      setIsLoading(false)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600"></div>
          <div
            className="absolute inset-0 rounded-full h-32 w-32 border-t-4 border-purple-600 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          ></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Campus Assets
              </h1>
              <p className="text-xs text-gray-500">Smart Management System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="rounded-xl hover:bg-blue-50">
                Login
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full blur-3xl transform -translate-y-1/2"></div>
        <div className="container mx-auto text-center relative">
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 border-0"
          >
            <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
            AI-Powered Asset Management
          </Badge>
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Manage Your Campus Assets
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Intelligently
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Streamline your campus resource management with our comprehensive platform featuring AI-powered operations,
            real-time analytics, and seamless file management.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="text-lg px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                <Zap className="mr-2 h-5 w-5" />
                Start Managing Assets
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-4 rounded-2xl border-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 bg-transparent"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need to Manage Assets</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform provides all the tools you need to efficiently track, manage, and analyze your campus
              resources.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-2xl transition-all duration-500 transform hover:scale-105 border-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
              <CardHeader className="text-center">
                <div className="mx-auto p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl w-fit mb-4 shadow-lg">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Real-time Dashboard</CardTitle>
                <CardDescription className="text-gray-600">
                  Get instant insights with comprehensive analytics and interactive charts
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-2xl transition-all duration-500 transform hover:scale-105 border-0 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
              <CardHeader className="text-center">
                <div className="mx-auto p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl w-fit mb-4 shadow-lg">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">AI Assistant</CardTitle>
                <CardDescription className="text-gray-600">
                  Use natural language to perform CRUD operations and get intelligent responses
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-2xl transition-all duration-500 transform hover:scale-105 border-0 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
              <CardHeader className="text-center">
                <div className="mx-auto p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl w-fit mb-4 shadow-lg">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">File Management</CardTitle>
                <CardDescription className="text-gray-600">
                  Import/export data via CSV and Excel with bulk operations support
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-2xl transition-all duration-500 transform hover:scale-105 border-0 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl">
              <CardHeader className="text-center">
                <div className="mx-auto p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl w-fit mb-4 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Role-based Access</CardTitle>
                <CardDescription className="text-gray-600">
                  Secure authentication with admin approval workflow and role management
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-2xl transition-all duration-500 transform hover:scale-105 border-0 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl">
              <CardHeader className="text-center">
                <div className="mx-auto p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl w-fit mb-4 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Resource Tracking</CardTitle>
                <CardDescription className="text-gray-600">
                  Complete CRUD operations with advanced search and filtering capabilities
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-2xl transition-all duration-500 transform hover:scale-105 border-0 bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl">
              <CardHeader className="text-center">
                <div className="mx-auto p-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl w-fit mb-4 shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Multi-user Support</CardTitle>
                <CardDescription className="text-gray-600">
                  Collaborate with team members with different permission levels
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto relative">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold">10K+</div>
              <div className="text-blue-100">Assets Managed</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold">500+</div>
              <div className="text-blue-100">Institutions</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold">99.9%</div>
              <div className="text-blue-100">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-900">Ready to Transform Your Asset Management?</h2>
          <p className="text-xl mb-10 text-gray-600">Join thousands of institutions already using our platform</p>
          <Link href="/auth/register">
            <Button
              size="lg"
              className="text-lg px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Globe className="mr-2 h-5 w-5" />
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold">Campus Assets</span>
          </div>
          <p className="text-gray-400">© 2024 Campus Assets Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
