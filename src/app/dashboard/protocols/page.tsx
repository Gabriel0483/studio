
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, WifiOff, Wrench, Annoyed, Anchor, Scale } from 'lucide-react';

const protocols = [
  {
    id: 'stability-loading',
    title: 'Vessel Stability & Loading (Weight & Balance)',
    icon: <Scale className="h-4 w-4" />,
    category: 'Compliance',
    checklist: [
      {
        step: "1. Monitor Deadweight Tonnage (DWT)",
        details: "Ensure the combined weight of passengers, cargo, fuel, and water does not exceed the vessel's certified maximum capacity."
      },
      {
        step: "2. Verify Trim & List",
        details: "Distribute cargo and passenger seating to ensure the vessel remains upright (no list) and maintain the proper draft difference between bow and stern (trim)."
      },
      {
        step: "3. Inspect Load Lines (Plimsoll Line)",
        details: "Visually confirm that the vessel is not sitting lower in the water than the allowed mark for current weather and water conditions."
      },
      {
        step: "4. Passenger Manifest Reconciliation",
        details: "Finalize the boarding count. If the vessel reaches 95% passenger capacity, the Captain must perform a final stability check before closing the gate."
      },
    ]
  },
  {
    id: 'trip-cancellation',
    title: 'Trip Cancellation (e.g., Weather)',
    icon: <AlertTriangle className="h-4 w-4" />,
    category: 'Operational',
    checklist: [
      {
        step: "1. Confirm Cancellation Decision",
        details: "Operations Manager or Station Manager to make the final call based on weather advisories or port authority instructions."
      },
      {
        step: "2. Update Trip Status",
        details: "In the 'Trip Management' dashboard, update the status of all affected trips to 'Cancelled'. This will notify passengers viewing the live status page."
      },
      {
        step: "3. Post Public Announcement",
        details: "Go to the 'Announcements' page and post a clear advisory detailing which trips are cancelled and the reason (e.g., 'Due to severe weather conditions from Typhoon...')."
      },
      {
        step: "4. Halt Boarding",
        details: "Ensure no passengers are boarded for the cancelled trips. Communicate with ground staff immediately."
      },
      {
        step: "5. Handle Bookings",
        details: "Go to the 'Rebooking & Refunds' page. Proactively contact affected passengers to offer a rebooking for the next available trip or a full refund."
      },
    ]
  },
  {
    id: 'technical-problem',
    title: 'Ship Technical Problem (At Port)',
    icon: <Wrench className="h-4 w-4" />,
    category: 'Technical',
    checklist: [
      {
        step: "1. Assess Severity",
        details: "Ship's captain or chief engineer to immediately report the issue and estimated time to resolve to the Operations Manager."
      },
      {
        step: "2. Decide on Delay vs. Cancellation",
        details: "If fixable within 1-2 hours, update trip status to 'Delayed'. If longer, consider cancellation or ship substitution."
      },
      {
        step: "3. Communicate to Passengers",
        details: "Post an 'Announcements' update. For 'Delayed' trips, provide an estimated new departure time. For 'Cancelled' trips, follow the Trip Cancellation Protocol."
      },
      {
        step: "4. Arrange for Repairs",
        details: "Operations Manager to schedule maintenance via the 'Maintenance' page and contact technical support."
      },
    ]
  },
  {
    id: 'it-outage',
    title: 'IT System / Internet Outage',
    icon: <WifiOff className="h-4 w-4" />,
    category: 'IT',
    checklist: [
      {
        step: "1. Confirm Scope of Outage",
        details: "Is it local internet, or is the Isla Konek platform down? Check if the public website is accessible from a different network (e.g., mobile data)."
      },
      {
        step: "2. Switch to Manual Procedures",
        details: "Revert to paper-based manifests and manual passenger check-in. Use printed manifest copies if available."
      },
      {
        step: "3. Communication",
        details: "Station Managers to keep staff informed. If the public site is down, prepare to handle passenger inquiries at the port."
      },
      {
        step: "4. Report to IT Support",
        details: "Immediately contact the IT support lead or Super Admin with details of the outage."
      },
       {
        step: "5. Data Reconciliation",
        details: "Once systems are back online, all manual booking and boarding data must be carefully entered into the system to reconcile records."
      },
    ]
  },
   {
    id: 'medical-emergency',
    title: 'Passenger Medical Emergency',
    icon: <Annoyed className="h-4 w-4" />,
    category: 'Safety',
    checklist: [
      {
        step: "1. Alert Authorities",
        details: "Immediately contact local emergency medical services (EMS) and the port authority."
      },
      {
        step: "2. Secure the Area",
        details: "Provide privacy for the affected passenger. Ask other passengers to provide space."
      },
      {
        step: "3. Assist EMS",
        details: "Guide EMS to the passenger's location upon their arrival. Provide any requested information."
      },
       {
        step: "4. Document Incident",
        details: "Station Manager or senior staff on duty must file a detailed incident report, including times, persons involved, and actions taken."
      },
    ]
  },
];


export default function ProtocolsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Interruption Protocols</h1>
          <p className="text-muted-foreground">
            Standard Operating Procedures (SOPs) for handling common incidents.
          </p>
        </div>
      </div>
      
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>For Internal Use Only</AlertTitle>
        <AlertDescription>
          This information is confidential and intended for Isla Konek staff. Follow these procedures to ensure consistent and safe incident response.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Incident Checklists</CardTitle>
          <CardDescription>Click on an incident type to view the step-by-step checklist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {protocols.map((protocol) => (
              <AccordionItem value={protocol.id} key={protocol.id}>
                <AccordionTrigger className="text-lg">
                  <div className="flex items-center gap-3">
                    {protocol.icon}
                    {protocol.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                    {protocol.checklist.map((item, index) => (
                        <div key={index} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                                    {index + 1}
                                </div>
                                {index < protocol.checklist.length - 1 && <div className="w-px h-full bg-border mt-1"></div>}
                            </div>
                            <div>
                                <h4 className="font-semibold">{item.step}</h4>
                                <p className="text-muted-foreground text-sm">{item.details}</p>
                            </div>
                        </div>
                    ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
