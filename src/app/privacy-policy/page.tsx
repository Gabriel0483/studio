
'use client'; 

import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState, useEffect } from 'react';

export default function PrivacyPolicyPage() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    // Set date only on client to avoid hydration mismatch
    setLastUpdated(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);


  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 bg-secondary">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
          <Card className="mx-auto max-w-4xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight">Privacy Policy</CardTitle>
              {lastUpdated && <CardDescription>Last updated: {lastUpdated}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-6 text-muted-foreground">
              <div className="space-y-2">
                <p>
                  Isla Konek ("us", "we", or "our") operates the Isla Konek website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Information Collection and Use</h2>
                <p>
                  We collect several different types of information for various purposes to provide and improve our Service to you.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Types of Data Collected</h3>
                <h4 className="font-semibold text-foreground">Personal Data</h4>
                <p>
                  While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li>Email address</li>
                  <li>First name and last name</li>
                  <li>Phone number</li>
                  <li>Booking and usage data</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Usage Data</h4>
                <p>
                  We may also collect information on how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Use of Data</h2>
                <p>Isla Konek uses the collected data for various purposes:</p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li>To provide and maintain the Service</li>
                  <li>To notify you about changes to our Service</li>
                  <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
                  <li>To provide customer care and support</li>
                  <li>To provide analysis or valuable information so that we can improve the Service</li>
                  <li>To monitor the usage of the Service</li>
                  <li>To detect, prevent and address technical issues</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Data Retention</h2>
                <p>
                  We retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. Booking records and associated PII are generally stored for a period of 90 days after the travel date for operational and accounting reconciliation, after which they are purged from our systems.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Your Rights</h2>
                <p>
                  You have the right to access, update, or delete the information we have on you. Whenever made possible, you can access, update or request deletion of your Personal Data directly within your account settings section. If you are unable to perform these actions yourself, please contact us to assist you.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Security of Data</h2>
                <p>
                  The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
