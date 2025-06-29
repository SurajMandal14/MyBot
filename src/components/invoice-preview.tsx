
'use client';

import { useState, useEffect } from 'react';
import type { InvoiceSchema } from '@/lib/validators';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from './ui/table';
import Image from 'next/image';

interface InvoicePreviewProps {
  invoiceData: InvoiceSchema | null;
}

export function InvoicePreview({ invoiceData }: InvoicePreviewProps) {
  const [currentDate, setCurrentDate] = useState('');

  const grandTotal = invoiceData?.items.reduce((acc, item) => acc + (item.total || 0), 0) || 0;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  if (!invoiceData) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 text-gray-400 rounded-sm">
        <div className="text-center">
            <p className="font-headline text-lg">Your invoice will appear here</p>
            <p className="text-sm">Start by pasting your service notes.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="invoice-print-area" className="bg-white text-black p-8 font-body text-[10px] w-full h-full overflow-auto flex flex-col relative">
        <div className="text-gray-700 -rotate-180 origin-center absolute top-1/2 left-[15px] tracking-[.2em] text-2xl font-light" style={{writingMode: 'vertical-rl'}}>
            Invoice [{invoiceData.invoiceNumber || '000000'}]
        </div>
        
        <header className="flex justify-between items-start pb-4 pl-12 border-b-2 border-primary">
            <div>
                <h1 className="text-2xl font-bold text-primary">FLYWHEELS <span className="font-light">THE AUTO EXPERTS</span></h1>
                <p className="text-gray-600 mt-2">Ayush hospital road, beside Saibaba temple</p>
                <p className="text-gray-600">Nagarjuna Nagar, Currency Nagar</p>
                <p className="text-gray-600">Vijayawada, Andhra Pradesh -520008</p>
            </div>
            <div className="w-48 h-24 relative">
                 <Image src="https://i.ibb.co/L5R9RZM/flywheels-logo.png" alt="Flywheels Logo" fill style={{ objectFit: 'contain' }} />
            </div>
        </header>

        <div className="grid grid-cols-3 gap-4 py-4 text-xs border-b-2 border-primary pl-12">
            <div>
                <p className="font-bold text-gray-500">Date</p>
                <p>{currentDate}</p>
            </div>
            <div>
                <p className="font-bold text-gray-500">To</p>
                <p>{invoiceData.customerName || 'N/A'}</p>
            </div>
             <div>
                <p className="font-bold text-primary">Ship To</p>
                <p>In-Store</p>
            </div>
        </div>
        
        <div className="py-4 pl-12 border-b-2 border-primary">
             <p className="font-bold text-primary text-xs">Vehicle Details</p>
             <p className="font-bold">{invoiceData.carModel || 'N/A'}</p>
             <p>{invoiceData.vehicleNumber || 'N/A'}</p>
        </div>

        <main className="flex-grow pt-4 pl-12">
            <Table>
                <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary/90 border-none">
                        <TableHead className="text-primary-foreground w-[50px]">Serial No.</TableHead>
                        <TableHead className="text-primary-foreground w-1/2">Description</TableHead>
                        <TableHead className="text-primary-foreground">Unit Price</TableHead>
                        <TableHead className="text-primary-foreground">Quantity</TableHead>
                        <TableHead className="text-primary-foreground text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoiceData.items.map((item, index) => (
                        <TableRow key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>{item.unitPrice ? formatCurrency(item.unitPrice) : ''}</TableCell>
                            <TableCell>{item.quantity || ''}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="border-t-2 border-primary hover:bg-white">
                        <TableCell colSpan={4} className="text-right font-bold text-base">GRAND TOTAL</TableCell>
                        <TableCell className="text-right font-bold text-base">{formatCurrency(grandTotal)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </main>
        
        <div className="text-center py-8">
            <p className="text-primary font-semibold">Thanks for choosing us to serve your automotive needs!</p>
        </div>
        <div className="absolute bottom-4 right-8 font-code text-xs text-gray-400">
            A 2LYP create
        </div>
    </div>
  );
}
