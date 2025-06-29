
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
    <div id="invoice-print-area" className="bg-white text-black p-8 font-body text-[10px] w-full h-full overflow-auto relative">
        <div className="text-gray-200 -rotate-180 origin-center absolute top-[35%] left-[25px] tracking-[.3em] text-5xl font-light z-0" style={{writingMode: 'vertical-rl'}}>
            INVOICE
        </div>
        
        <div className="relative z-10 flex flex-col h-full">
            <header className="flex justify-between items-start pb-4">
                <div className="flex items-start">
                    <div className="pl-16">
                        <h1 className="text-2xl font-bold text-primary flex items-center">
                            <span className="w-8 h-px bg-primary mr-2"></span>
                            FLYWHEELS <span className="font-light ml-2">THE AUTO EXPERTS</span>
                        </h1>
                        <p className="text-gray-600 mt-2">Ayush hospital road, beside Saibaba temple</p>
                        <p className="text-gray-600">Nagarjuna Nagar, Currency Nagar</p>
                        <p className="text-gray-600">Vijayawada, Andhra Pradesh -520008</p>
                        <p className="text-gray-600 font-medium mt-2">GST IN : 37AAJFF3362M1Z1</p>
                    </div>
                </div>
                <div className="w-48 h-24 relative -mt-2">
                     <Image src="https://i.ibb.co/JqjJvJh/flywheels-logo-1.png" alt="Flywheels Logo" fill style={{ objectFit: 'contain' }} />
                </div>
            </header>

            <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t-2 border-primary">
                 <div>
                    <p className="font-bold text-gray-500">Invoice No.</p>
                    <p>{invoiceData.invoiceNumber || 'N/A'}</p>
                </div>
                <div>
                    <p className="font-bold text-gray-500">Date</p>
                    <p>{currentDate}</p>
                </div>
                <div>
                    <p className="font-bold text-gray-500">To</p>
                    <p>{invoiceData.customerName || 'N/A'}</p>
                </div>
            </div>
            
            <div className="py-2 mt-4 border-t border-border">
                 <p className="font-bold text-primary text-xs">Vehicle Details</p>
                 <div className="grid grid-cols-2 gap-4 mt-1">
                    <div>
                        <p className="font-bold">Model</p>
                        <p>{invoiceData.carModel || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="font-bold">Car Number</p>
                        <p>{invoiceData.vehicleNumber || 'N/A'}</p>
                    </div>
                 </div>
            </div>

            <main className="flex-grow pt-4">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-primary hover:bg-primary/90">
                            <TableHead className="text-primary-foreground w-[50px] text-center">Serial No.</TableHead>
                            <TableHead className="text-primary-foreground w-1/2">Description</TableHead>
                            <TableHead className="text-primary-foreground text-right">Unit Price</TableHead>
                            <TableHead className="text-primary-foreground text-right">Quantity</TableHead>
                            <TableHead className="text-primary-foreground text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoiceData.items.map((item, index) => (
                            <TableRow key={index} className="border-b-2 border-white">
                                <TableCell className="text-center bg-gray-100">{index + 1}</TableCell>
                                <TableCell className="font-medium bg-gray-100">{item.description}</TableCell>
                                <TableCell className="text-right bg-gray-100">{item.unitPrice ? formatCurrency(item.unitPrice) : ''}</TableCell>
                                <TableCell className="text-right bg-gray-100">{item.quantity || ''}</TableCell>
                                <TableCell className="text-right font-medium bg-gray-100">{formatCurrency(item.total)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="border-t-2 border-primary">
                            <TableCell colSpan={4} className="text-right font-bold text-base">GRAND TOTAL</TableCell>
                            <TableCell className="text-right font-bold text-base">{formatCurrency(grandTotal)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </main>
            
            <div className="mt-auto">
                <div className="text-center pt-8 pb-4">
                    <p className="text-primary font-semibold">Thanks for choosing us to serve your automotive needs!</p>
                </div>

                <footer className="text-xs text-primary border-t-2 border-primary pt-2">
                    <div className="flex justify-between">
                        <div>
                            <p><span className="font-bold">Tel:</span> +91-9966783333</p>
                            <p>+91-9563998998</p>
                        </div>
                         <div className="text-right">
                            <p><span className="font-bold">Email:</span> flywheelsauto.vjy@gmail.com</p>
                            <p><span className="font-bold">Web:</span> www.flywheelsauto.in</p>
                        </div>
                    </div>
                </footer>
                <div className="text-right font-code text-xs text-gray-400 mt-2 pr-1">
                    A 2LYP create
                </div>
            </div>
        </div>
    </div>
  );
}
