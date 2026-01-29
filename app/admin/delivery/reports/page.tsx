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
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/pf_logo.png")
      .then(async (res) => {
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => setLogoBase64(undefined));
  }, []);

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

  const handleExportPDF = async () => {
    if (!report) return;

    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 20;

      const margin = 20;
      const logoWidth = 30;
      const logoHeight = 30;
      const logoY = yPosition - 8;

      // Header Section
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("ChopRek", margin, yPosition);

      if (logoBase64) {
        doc.addImage(
          logoBase64,
          "PNG",
          pageWidth - margin - logoWidth,
          logoY,
          logoWidth,
          logoHeight,
        );
      }

      yPosition += 10;
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.text("Delivery Driver Payment Receipt", margin, yPosition);

      // Date Range
      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const dateRangeText = `Report Period: ${report.weekStart} - ${report.weekEnd}`;
      doc.text(dateRangeText, margin, yPosition);

      // Horizontal line
      yPosition += 10;
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);

      // Summary Section
      yPosition += 15;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE SUMMARY", margin, yPosition);

      yPosition += 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      // Summary boxes
      const totalPayments = report.driverPerformance.reduce(
        (sum, d) => sum + d.totalEarnings,
        0,
      );
      const summaryData = [
        ["Total Deliveries:", report.totalDeliveries.toString()],
        ["Total Orders Delivered:", report.totalOrdersDelivered.toString()],
        ["Active Drivers:", report.driverPerformance.length.toString()],
        ["Total Payments:", `D${totalPayments.toFixed(2)}`],
      ];

      // Create summary table
      autoTable(doc, {
        startY: yPosition,
        head: [["Metric", "Value"]],
        body: summaryData,
        theme: "grid",
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 60 },
          1: { cellWidth: 40, halign: "right" },
        },
        margin: { left: margin, right: margin },
        tableWidth: 100,
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Check if we need a new page
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 20;
      }

      // Driver Performance Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("DRIVER PAYMENT DETAILS", margin, yPosition);

      yPosition += 5;
      const driverDetailsData = report.driverPerformance.map(
        (driver, index) => [
          (index + 1).toString(),
          driver.driverName,
          driver.deliveriesCount.toString(),
          driver.ordersCount.toString(),
          `D${driver.totalEarnings.toFixed(2)}`,
        ],
      );

      autoTable(doc, {
        startY: yPosition,
        head: [["#", "Driver Name", "Deliveries", "Orders", "Total Payment"]],
        body: driverDetailsData,
        theme: "striped",
        headStyles: {
          fillColor: [46, 125, 50],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 10,
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 15, halign: "center" },
          1: { cellWidth: 60 },
          2: { cellWidth: 30, halign: "center" },
          3: { cellWidth: 25, halign: "center" },
          4: { cellWidth: 35, halign: "right", fontStyle: "bold" },
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
        doc.text(
          "© 2025 ChopRek. All rights reserved.",
          margin,
          pageHeight - 10,
        );
      }

      const fileName = `driver-receipt-${report.weekStart}-${report.weekEnd}.pdf`;
      doc.save(fileName);

      toast({
        title: "Success",
        description: "Driver receipt exported as PDF",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
      console.error("PDF export error:", error);
    }
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
