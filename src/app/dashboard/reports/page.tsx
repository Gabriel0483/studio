'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Construction } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Generate reports and gain insights into your business performance.</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled>
          <Download className="mr-2 h-4 w-4" />
          Export Revenue Report
        </Button>
        <Button variant="outline" disabled>
          <Download className="mr-2 h-4 w-4" />
          Export Bookings Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports Under Construction</CardTitle>
          <CardDescription>
            This section is currently being developed. Real-time, dynamic reports will be available here soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[450px] w-full flex-col items-center justify-center rounded-lg border border-dashed text-center">
            <Construction className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Coming Soon</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We're working hard to bring you insightful reports and analytics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
