"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WeeklyDeliveryReport } from "@/lib/types";
import { generateDeliveryReport } from "@/services/deliveries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Truck,
  Package,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithPresets } from "@/components/ui/date-picker-with-presets";
import type { DateRange } from "react-day-picker";

export default function DeliveryReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<WeeklyDeliveryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [reportType, setReportType] = useState<
    "daily" | "weekly" | "monthly" | "custom"
  >("weekly");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Set defaults based on selected report type (matches Comprehensive Reports behavior)
  useEffect(() => {
    const today = new Date();

    if (reportType === "daily") {
      setWeekStart(today.toISOString().split("T")[0]);
      setWeekEnd(today.toISOString().split("T")[0]);
    } else if (reportType === "weekly") {
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      // Use Friday as the end of the work week (Monday - Friday)
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      setWeekStart(monday.toISOString().split("T")[0]);
      setWeekEnd(friday.toISOString().split("T")[0]);
    } else if (reportType === "monthly") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      setWeekStart(first.toISOString().split("T")[0]);
      setWeekEnd(last.toISOString().split("T")[0]);
    } else if (reportType === "custom") {
      if (dateRange?.from && dateRange?.to) {
        setWeekStart(dateRange.from.toISOString().split("T")[0]);
        setWeekEnd(dateRange.to.toISOString().split("T")[0]);
      } else {
        setWeekStart("");
        setWeekEnd("");
      }
    }
  }, [reportType, dateRange]);

  const handleGenerateReport = async () => {
    if (!weekStart || !weekEnd) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const reportData = await generateDeliveryReport(weekStart, weekEnd);
      setReport(reportData);
      toast({
        title: "Success",
        description: "Report generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!report) return;

    // Import jsPDF
    import("jspdf").then((module) => {
      const { jsPDF } = module;
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 20;

      // Header
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("ChopRek", 20, yPosition);

      yPosition += 10;
      doc.setFontSize(16);
      doc.text("Delivery Driver Payment Receipt", 20, yPosition);

      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Week: ${report.weekStart} to ${report.weekEnd}`, 20, yPosition);

      yPosition += 5;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);

      // Line separator
      yPosition += 10;
      doc.setLineWidth(0.5);
      doc.line(20, yPosition, pageWidth - 20, yPosition);

      // Driver payments section
      yPosition += 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Driver Payments", 20, yPosition);

      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      report.driverPerformance.forEach((driver, index) => {
        // Driver name
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${driver.driverName}`, 25, yPosition);

        yPosition += 6;
        doc.setFont("helvetica", "normal");
        doc.text(
          `   Deliveries Made: ${driver.deliveriesCount}`,
          25,
          yPosition,
        );

        yPosition += 5;
        doc.text(`   Orders Carried: ${driver.ordersCount}`, 25, yPosition);

        yPosition += 5;
        doc.setFont("helvetica", "bold");
        doc.text(
          `   Total Payment: D${driver.totalEarnings.toFixed(2)}`,
          25,
          yPosition,
        );

        yPosition += 10;
        doc.setFont("helvetica", "normal");

        // Add new page if needed
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
      });

      // Summary
      yPosition += 10;
      doc.setLineWidth(0.5);
      doc.line(20, yPosition, pageWidth - 20, yPosition);

      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Week Summary", 20, yPosition);

      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Deliveries: ${report.totalDeliveries}`, 25, yPosition);

      yPosition += 6;
      doc.text(
        `Total Orders Delivered: ${report.totalOrdersDelivered}`,
        25,
        yPosition,
      );

      yPosition += 6;
      doc.setFont("helvetica", "bold");
      doc.text(
        `Total Payments: D${report.driverPerformance.reduce((sum, d) => sum + d.totalEarnings, 0).toFixed(2)}`,
        25,
        yPosition,
      );

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("© 2025 ChopRek. All rights reserved.", 20, pageHeight - 10);

      // Save PDF
      const fileName = `driver-receipt-${report.weekStart}-${report.weekEnd}.pdf`;
      doc.save(fileName);

      toast({
        title: "Success",
        description: "Driver receipt exported as PDF",
      });
    });
  };

  const handleExportExcel = () => {
    if (!report) return;

    // Create CSV content
    let csv = "Delivery Report\n\n";
    csv += `Week: ${report.weekStart} to ${report.weekEnd}\n\n`;
    csv += "Summary\n";
    csv += `Total Deliveries,${report.totalDeliveries}\n`;
    csv += `Total Orders Delivered,${report.totalOrdersDelivered}\n`;
    csv += `Motorcycle Deliveries,${report.motorcycleCount}\n`;
    csv += `Taxi Deliveries,${report.taxiCount}\n`;
    csv += `Motorcycle Cost,D${report.motorcycleCost.toFixed(2)}\n`;
    csv += `Taxi Cost,D${report.taxiCost.toFixed(2)}\n`;
    csv += `Total Cost,D${report.totalCost.toFixed(2)}\n\n`;

    csv += "Driver Performance\n";
    csv += "Driver Name,Deliveries,Orders,Earnings\n";
    report.driverPerformance.forEach((driver) => {
      csv += `${driver.driverName},${driver.deliveriesCount},${driver.ordersCount},D${driver.totalEarnings.toFixed(2)}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-report-${report.weekStart}-${report.weekEnd}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report exported as CSV",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/delivery")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Delivery Report</h1>
            <p className="text-muted-foreground">
              Financial and performance analysis
            </p>
          </div>
        </div>
        {report && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              Driver Receipt
            </Button>
          </div>
        )}
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Range</CardTitle>
          <CardDescription>
            Choose report period (daily, weekly Mon–Fri, monthly or custom)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Report Type</Label>
              <Select
                value={reportType}
                onValueChange={(v) => setReportType(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (Mon–Fri)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "custom" && (
              <div className="flex-1 min-w-[250px]">
                <Label>Date Range</Label>
                <DatePickerWithPresets
                  date={dateRange}
                  setDate={setDateRange}
                />
              </div>
            )}

            <div className="flex-1 min-w-[180px]">
              <Label>Start Date</Label>
              <Input id="weekStart" type="date" value={weekStart} readOnly />
            </div>

            <div className="flex-1 min-w-[180px]">
              <Label>End Date</Label>
              <Input id="weekEnd" type="date" value={weekEnd} readOnly />
            </div>

            <div className="flex items-end mt-6">
              <Button onClick={handleGenerateReport} disabled={loading}>
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {report && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Deliveries
                </CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.totalDeliveries}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  🏍️ {report.motorcycleCount} | 🚕 {report.taxiCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Orders Delivered
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.totalOrdersDelivered}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {report.totalDeliveries > 0
                    ? `${(report.totalOrdersDelivered / report.totalDeliveries).toFixed(1)} per delivery`
                    : "No deliveries"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Cost
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  D{report.totalCost.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All delivery expenses
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Cost/Delivery
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  D
                  {report.totalDeliveries > 0
                    ? (report.totalCost / report.totalDeliveries).toFixed(2)
                    : "0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Per delivery average
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Method Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Method Breakdown</CardTitle>
              <CardDescription>
                Cost comparison by delivery method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">🏍️ Motorcycle</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deliveries:</span>
                      <span className="font-medium">
                        {report.motorcycleCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cost:</span>
                      <span className="font-medium">
                        D{report.motorcycleCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg. Cost:</span>
                      <span className="font-medium">
                        D
                        {report.motorcycleCount > 0
                          ? (
                              report.motorcycleCost / report.motorcycleCount
                            ).toFixed(2)
                          : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">🚕 Taxi</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deliveries:</span>
                      <span className="font-medium">{report.taxiCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cost:</span>
                      <span className="font-medium">
                        D{report.taxiCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg. Cost:</span>
                      <span className="font-medium">
                        D
                        {report.taxiCount > 0
                          ? (report.taxiCost / report.taxiCount).toFixed(2)
                          : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Driver Performance</CardTitle>
              <CardDescription>
                Individual driver statistics for the week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.driverPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No driver activity for this period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver Name</TableHead>
                      <TableHead className="text-right">Deliveries</TableHead>
                      <TableHead className="text-right">
                        Orders Carried
                      </TableHead>
                      <TableHead className="text-right">
                        Total Earnings
                      </TableHead>
                      <TableHead className="text-right">
                        Avg. per Delivery
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.driverPerformance
                      .sort((a, b) => b.totalEarnings - a.totalEarnings)
                      .map((driver) => (
                        <TableRow key={driver.driverId}>
                          <TableCell className="font-medium">
                            {driver.driverName}
                          </TableCell>
                          <TableCell className="text-right">
                            {driver.deliveriesCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {driver.ordersCount}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${driver.totalEarnings.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            $
                            {(
                              driver.totalEarnings / driver.deliveriesCount
                            ).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {report.driverPerformance.reduce(
                          (sum, d) => sum + d.deliveriesCount,
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.driverPerformance.reduce(
                          (sum, d) => sum + d.ordersCount,
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        D
                        {report.driverPerformance
                          .reduce((sum, d) => sum + d.totalEarnings, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!report && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Report Generated</p>
            <p className="text-sm text-muted-foreground">
              Select a date range and click "Generate Report" to view delivery
              statistics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
