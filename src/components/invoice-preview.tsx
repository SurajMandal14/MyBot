'use client';

import { useState, useEffect } from 'react';
import type { InvoiceSchema } from '@/lib/validators';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
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
    <div id="invoice-print-area" className="relative bg-white text-black p-8 font-body text-[10px] w-full h-full overflow-auto">
        {/* Watermark */}
        <div 
            className="absolute top-1/4 left-8 text-primary/10 font-light z-0 flex items-center"
            style={{ writingMode: 'vertical-rl' }}
        >
            <div className="text-7xl tracking-[0.2em] whitespace-nowrap">INVOICE</div>
            <div className="text-5xl tracking-[0.1em] ml-4">[{invoiceData.invoiceNumber || 'N/A'}]</div>
        </div>
        
        <div className="relative z-10 flex flex-col h-full">
            <div className="pl-24 flex-grow flex flex-col">
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
                        <Image src="https://i.ibb.co/6y4nL0B/showcase-flywheels-logo-red.png" alt="Flywheels Logo" fill style={{ objectFit: 'contain' }} data-ai-hint="car logo" />
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
                        <p>{invoiceData.customerName || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="font-bold text-primary">Ship To</p>
                        <p>In-Store</p>
                    </div>
                </div>
                
                <div className="w-full h-px bg-gray-200 my-4"></div>

                <div className="text-xs">
                    <p className="font-bold text-primary mb-1">Vehicle Details</p>
                    <p>{invoiceData.carModel || 'N/A'}</p>
                    <p>{invoiceData.vehicleNumber || 'N/A'}</p>
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
                            {invoiceData.items.map((item, index) => (
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
                
                 <div className="mt-auto">
                    <div className="flex flex-col items-end">
                        <div className="w-full h-px bg-gray-200 mt-4"></div>
                        <div className="flex justify-between items-center w-[250px] pt-2">
                            <span className="font-bold text-sm">GRAND TOTAL</span>
                            <span className="font-bold text-sm">{formatCurrency(grandTotal)}</span>
                        </div>
                    </div>
                    
                    <footer className="mt-12 pt-4 border-t border-gray-300 text-[9px]">
                        <div className="grid grid-cols-2 gap-x-4">
                            <div>
                                <div className="flex">
                                    <p className="w-10 font-bold text-primary">Tel:</p>
                                    <div className="flex flex-col">
                                        <p>+ 91-9966783333</p>
                                        <p>+ 91-9563998998</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex">
                                    <p className="w-10 font-bold text-primary">Email:</p>
                                    <p>flywheelsauto.vjy@gmail.com</p>
                                </div>
                                <div className="flex mt-1">
                                    <p className="w-10 font-bold text-primary">Web:</p>
                                    <p>www.flywheelsauto.in</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-center text-gray-400 mt-4 text-[8px]">
                            <p>A 2LYP create</p>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    </div>
  );
}
