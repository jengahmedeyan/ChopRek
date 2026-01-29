"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Redirect authenticated users to their dashboard
    if (!loading && user) {
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/employee/menu");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <span className="text-xl font-bold text-gray-900">ChopRek</span>
              <Link
                href="https://primeforge.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Badge
                  variant="outline"
                  className="ml-2 cursor-pointer hover:bg-gray-100"
                >
                  Primeforge.io
                </Badge>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push("/auth/signin")}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-orange-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
                Primeforge Internal System
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
                Primeforge
                <span className="text-blue-600 block">Lunch Ordering</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Welcome to ChopRek - Primeforge's internal lunch ordering
                system. Order your daily meals with ease and track your orders
                in real-time.
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Daily menu updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Real-time tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Easy to use</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Today’s Gambian Menu
                  </h3>
                  <Badge className="bg-green-100 text-green-800">
                    Available
                  </Badge>
                </div>

                <div className="space-y-3">
                  {/* Domoda */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Domoda (Groundnut Stew)</p>
                      <p className="text-sm text-gray-600">
                        Rich peanut sauce with beef or chicken, served with rice
                      </p>
                    </div>
                    <span className="font-bold text-green-600">D120.00</span>
                  </div>

                  {/* Benachin */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Benachin (Jollof Rice)</p>
                      <p className="text-sm text-gray-600">
                        One-pot rice cooked with fish, vegetables, and spices
                      </p>
                    </div>
                    <span className="font-bold text-green-600">D100.00</span>
                  </div>

                  {/* Yassa */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Chicken Yassa</p>
                      <p className="text-sm text-gray-600">
                        Grilled chicken in lemon-onion sauce, served with rice
                      </p>
                    </div>
                    <span className="font-bold text-green-600">D130.00</span>
                  </div>
                </div>

                <Button
                  className="w-full mt-4"
                  onClick={() => router.push("/auth/signin")}
                >
                  Order Now
                </Button>
              </div>

              <div className="absolute -top-4 -right-4 bg-orange-500 text-white p-3 rounded-full shadow-lg">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Get Started
            </h2>
            <p className="text-xl text-gray-600">
              Sign in to access the daily menu and place your order
            </p>
          </div>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <UtensilsCrossed className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Ready to order lunch?
              </h3>
              <p className="text-gray-600 mb-6">
                Sign in with your account to view today's menu and place your
                order.
              </p>
              <Button
                size="lg"
                onClick={() => router.push("/auth/signin")}
                className="px-8"
              >
                Sign In to Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <span className="text-2xl">🍽️</span>
              <span className="text-xl font-bold">ChopRek</span>
              <span>by
              <Link
                href="https://www.linkedin.com/in/ahmed-eyan-jeng"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
              >
                Ahmed Eyan Jeng
              </Link>
              </span>
            </div>
            <p className="text-gray-400">
              © {new Date().getFullYear()} Primeforge.io. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
