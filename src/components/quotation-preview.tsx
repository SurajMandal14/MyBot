'use client';

import { useState, useEffect } from 'react';
import type { QuotationSchema } from '@/lib/validators';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import Image from 'next/image';

interface QuotationPreviewProps {
  quotationData: QuotationSchema | null;
}

export function QuotationPreview({ quotationData }: QuotationPreviewProps) {
  const [currentDate, setCurrentDate] = useState('');

  const grandTotal = quotationData?.items.reduce((acc, item) => acc + (item.total || 0), 0) || 0;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };
  
  useEffect(() => {
    setCurrentDate(formatDate(new Date()));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!quotationData) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 text-gray-400 rounded-sm">
        <div className="text-center">
            <p className="font-headline text-lg">Your quotation will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div id="quotation-print-area" className="bg-white text-black p-8 font-body text-[10px] w-full h-full overflow-auto relative">
        <div className="text-primary/20 -rotate-90 origin-top-left absolute top-0 left-8 tracking-[.3em] text-5xl font-light z-0" style={{writingMode: 'vertical-rl'}}>
            Quotation [{quotationData.quotationNumber || 'N/A'}]
        </div>
        
        <div className="relative z-10 flex flex-col h-full pl-12">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-primary">
                        FLYWHEELS <span className="font-light text-lg text-foreground">THE AUTO EXPERTS</span>
                    </h1>
                    <p className="text-gray-500 mt-2 text-xs">Ayush hospital road, beside Saibaba temple</p>
                    <p className="text-gray-500 text-xs">Nagarjuna Nagar, Currency Nagar</p>
                    <p className="text-gray-500 text-xs">Vijayawada, Andhra Pradesh -520008</p>
                </div>
                <div className="w-32 h-20 relative">
                     <Image src="https://storage.googleapis.com/idx-dev-01-public-images/showcase-flywheels-logo.png" alt="Flywheels Logo" fill style={{ objectFit: 'contain' }} data-ai-hint="car logo" />
                </div>
            </header>

            <div className="w-full h-px bg-primary/50 my-4"></div>
            
            <div className="grid grid-cols-3 gap-4 text-xs">
                 <div>
                    <p className="font-bold text-primary">Date</p>
                    <p>{currentDate}</p>
                </div>
                <div>
                    <p className="font-bold text-primary">To</p>
                    <p>{quotationData.customerName || 'N/A'}</p>
                </div>
                <div>
                    <p className="font-bold text-primary">Ship To</p>
                    <p>In-Store</p>
                </div>
            </div>
            
            <div className="w-full h-px bg-gray-200 my-4"></div>

            <div className="text-xs">
                 <p className="font-bold text-primary mb-1">Vehicle Details</p>
                 <p>{quotationData.carModel || 'N/A'}</p>
                 <p>{quotationData.vehicleNumber || 'N/A'}</p>
            </div>

            <main className="flex-grow pt-4">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-primary hover:bg-primary/90">
                            <TableHead className="text-primary-foreground w-[50px]">Serial No.</TableHead>
                            <TableHead className="text-primary-foreground w-[45%]">Description</TableHead>
                            <TableHead className="text-primary-foreground text-right">Unit Price</TableHead>
                            <TableHead className="text-primary-foreground text-right">Quantity</TableHead>
                            <TableHead className="text-primary-foreground text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {quotationData.items.map((item, index) => (
                            <TableRow key={index} className="border-b-gray-200">
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell className="font-medium">{item.description}</TableCell>
                                <TableCell className="text-right">{item.unitPrice && item.unitPrice > 0 ? formatCurrency(item.unitPrice) : ''}</TableCell>
                                <TableCell className="text-right">{item.quantity || ''}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </main>
            
            <div className="mt-auto flex flex-col items-end">
                <div className="w-full h-px bg-gray-200 mt-4"></div>
                <div className="flex justify-between items-center w-[250px] pt-2">
                    <span className="font-bold text-sm">ESTIMATED TOTAL</span>
                    <span className="font-bold text-sm">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="text-center pt-8 pb-4">
                    <p className="text-primary font-semibold text-xs">Thanks for choosing us to serve your automotive needs!</p>
                </div>
            </div>
        </div>
    </div>
  );
}
