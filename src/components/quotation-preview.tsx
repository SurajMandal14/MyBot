'use client';

import { useState, useEffect } from 'react';
import type { QuotationSchema } from '@/lib/validators';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

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

  const formattedQuotationNumber = quotationData?.quotationNumber.replace('Q', '').toString().padStart(5, '0');

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
    <div id="quotation-print-area" className="relative bg-white text-black p-8 font-body text-[10px] w-full h-full overflow-auto">
        {/* Watermark */}
        <div 
            className="absolute top-8 left-4 font-bold text-5xl z-0 tracking-[0.2em] opacity-60"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
            <span className="text-gray-800">Quotation </span>
            <span className="text-primary">[{formattedQuotationNumber}]</span>
        </div>
        
        <div className="relative z-10 flex flex-col h-full ml-[60px]">
             <header className="flex justify-between items-start -mt-8">
                <div>
                    <h1 className="text-3xl font-bold text-primary whitespace-nowrap">
                        FLYWHEELS AUTO
                    </h1>
                    <div className="text-gray-600 mt-2 text-xs leading-snug">
                        <p>Ayush hospital road, beside Saibaba temple</p>
                        <p>Nagarjuna Nagar, Currency Nagar</p>
                        <p>Vijayawada, Andhra Pradesh -520008</p>
                        <p className="font-bold mt-1 text-black">GST IN: 37AAJFF3362M1Z1</p>
                    </div>
                </div>
                <div className="w-96 h-48 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://lh3.googleusercontent.com/p/AF1QipMM0m7qWmmlOkZMr-jto2vdsuC-xbzn8DYaTQIF=s1360-w1360-h1020-rw" alt="Flywheels Logo" className="w-full h-full object-contain" data-ai-hint="car logo" />
                </div>
            </header>

            <div className="w-full h-px bg-primary my-4"></div>
            
            <section className="grid grid-cols-3 gap-4 text-xs mb-4">
                <div>
                    <p className="font-bold text-primary">Date</p>
                    <p className="text-gray-800">{currentDate}</p>
                </div>
                <div>
                    <p className="font-bold text-primary">To</p>
                    <p className="text-gray-800 font-medium">{quotationData.customerName || 'N/A'}</p>
                </div>
                <div>
                    <p className="font-bold text-primary">Ship To</p>
                    <p className="text-gray-800">In-Store</p>
                </div>
            </section>
            
            <div className="w-full h-px bg-gray-200 mb-4"></div>

            <section className="text-xs mb-4">
                <p className="font-bold text-primary mb-1">Vehicle Details</p>
                <p className="text-gray-800">{quotationData.carModel || 'N/A'}</p>
                <p className="text-gray-800">{quotationData.vehicleNumber || 'N/A'}</p>
            </section>

            <main className="flex-grow">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-primary hover:bg-primary/90">
                            <TableHead className="text-primary-foreground w-[50px] font-bold">Serial No.</TableHead>
                            <TableHead className="text-primary-foreground w-[45%] font-bold">Description</TableHead>
                            <TableHead className="text-primary-foreground text-right font-bold">Unit Price</TableHead>
                            <TableHead className="text-primary-foreground text-right font-bold">Quantity</TableHead>
                            <TableHead className="text-primary-foreground text-right font-bold">Total</TableHead>
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
            
            <div className="mt-auto pt-4">
                 <div className="flex flex-col items-end">
                    <div className="w-full border-t-2 border-primary mb-2"></div>
                    <div className="flex justify-between items-center w-[250px]">
                        <span className="font-bold text-base text-gray-800">ESTIMATED TOTAL</span>
                        <span className="font-bold text-base text-gray-800">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>

                <p className="text-center text-primary text-xs mt-4">
                    Thanks for choosing us to serve your automotive needs!
                </p>

                <footer className="mt-12 pt-4 border-t-2 border-gray-300 text-[9px]">
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
  );
}
