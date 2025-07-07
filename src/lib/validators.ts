import { z } from 'zod';

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  quantity: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  total: z.coerce.number().min(0),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  vehicleNumber: z.string().min(1, 'Vehicle number is required.'),
  customerName: z.string().min(1, 'Customer name is required.'),
  carModel: z.string().min(1, 'Car model is required.'),
  items: z.array(lineItemSchema),
});

export const quotationSchema = z.object({
  quotationNumber: z.string(),
  vehicleNumber: z.string().min(1, 'Vehicle number is required.'),
  customerName: z.string().min(1, 'Customer name is required.'),
  carModel: z.string().min(1, 'Car model is required.'),
  items: z.array(lineItemSchema),
});

export const receiptSchema = z.object({
  receiptNumber: z.string(),
  vehicleNumber: z.string().min(1, 'Vehicle number is required.'),
  customerName: z.string().min(1, 'Customer name is required.'),
  carModel: z.string().min(1, 'Car model is required.'),
  items: z.array(lineItemSchema),
});


export type InvoiceSchema = z.infer<typeof invoiceSchema>;
export type QuotationSchema = z.infer<typeof quotationSchema>;
export type ReceiptSchema = z.infer<typeof receiptSchema>;
export type LineItemSchema = z.infer<typeof lineItemSchema>;
