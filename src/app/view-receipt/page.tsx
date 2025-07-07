'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ReceiptPreview } from '@/components/receipt-preview';
import type { ReceiptSchema } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import pako from 'pako';

function ViewReceiptPage() {
    const searchParams = useSearchParams();
    const [receiptData, setReceiptData] = useState<ReceiptSchema | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const dataParam = searchParams.get('data');
        if (dataParam) {
            try {
                // The browser's Buffer polyfill may not support 'base64url'.
                // We manually convert base64url to standard base64.
                let base64 = dataParam.replace(/-/g, '+').replace(/_/g, '/');
                // Pad with '=' to make it a valid base64 string
                while (base64.length % 4) {
                    base64 += '=';
                }
                const compressedData = Buffer.from(base64, 'base64');
                // Decompress
                const decompressedJson = pako.inflate(compressedData, { to: 'string' });
                const parsedData = JSON.parse(decompressedJson);
                setReceiptData(parsedData);
            } catch (e) {
                console.error("Failed to parse receipt data:", e);
                setError("Invalid receipt data provided. The link may be corrupted or in an old format.");
            }
        } else {
            setError("No receipt data found in the link.");
        }
        setIsLoading(false);
    }, [searchParams]);

    const handlePrint = () => {
        if(!receiptData) return;
        document.title = `Receipt-${receiptData.vehicleNumber || 'draft'}`;
        window.print();
    }

    const LoadingState = () => (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading Receipt...</p>
      </main>
    );

    if (isLoading) {
        return <LoadingState />;
    }
    
    if (error) {
         return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
                 <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                    </CardContent>
                </Card>
            </main>
        )
    }
    
    return (
         <main className="bg-gray-50 py-8 px-4 print:bg-white">
            <div className="container mx-auto">
                <div className="flex justify-between items-center mb-8 no-print">
                    <div className="flex items-center gap-3">
                        <Logo className="h-8 w-8 text-primary" />
                        <h1 className="font-headline text-3xl font-bold">
                            Receipt Preview
                        </h1>
                    </div>
                    <Button onClick={handlePrint} disabled={!receiptData}>
                        <FileText className="mr-2 h-4 w-4" /> Print / Save as PDF
                    </Button>
                </div>
                <Card className="shadow-lg print:shadow-none print:border-none">
                    <CardContent className="p-0 print:p-0">
                        <div className="aspect-[8.5/11] bg-white rounded-md border print:aspect-auto print:rounded-none print:border-none">
                            <ReceiptPreview receiptData={receiptData} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

// Suspense boundary is required for useSearchParams
export default function Page() {
    return (
        <Suspense fallback={
             <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading Receipt...</p>
            </main>
        }>
            <ViewReceiptPage />
        </Suspense>
    )
}
