
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { receiptSchema, type ReceiptSchema } from '@/lib/validators';
import { useToast } from '@/hooks/use-toast';
import { modifyInvoiceAction, parseReceiptAction } from '@/app/actions';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReceiptPreview } from './receipt-preview';
import { Loader2, Plus, Trash2, Wand2, FileText, Bot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const initialReceiptState: ReceiptSchema = {
  receiptNumber: '',
  customerName: '',
  vehicleNumber: '',
  carModel: '',
  items: [],
};

export function ReceiptCreator() {
  const [isParsing, startParsing] = useTransition();
  const [isModifying, startModifying] = useTransition();
  const [rawText, setRawText] = useState('');
  const [aiCommand, setAiCommand] = useState('');
  const [isReceiptReady, setIsReceiptReady] = useState(false);

  const { toast } = useToast();

  const form = useForm<ReceiptSchema>({
    resolver: zodResolver(receiptSchema),
    defaultValues: initialReceiptState,
    mode: 'onChange'
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({ control: form.control, name: "items" });
  const receiptData = useWatch({ control: form.control });

  useEffect(() => {
      watchedItems.forEach((item, index) => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;

          if (quantity > 0 && unitPrice > 0) {
            const newTotal = quantity * unitPrice;
            if (Math.abs((item.total || 0) - newTotal) > 0.01) {
                update(index, { ...item, total: newTotal });
            }
          }
      });
  }, [watchedItems, update]);


  const handleParse = () => {
    if (!rawText.trim()) {
      toast({ title: 'Input is empty', description: 'Please paste your service notes.', variant: 'destructive' });
      return;
    }
    startParsing(async () => {
      const result = await parseReceiptAction({ text: rawText });
      if (result.success && result.data) {
        form.reset(result.data);
        setIsReceiptReady(true);
        toast({ title: 'Parsing Successful', description: 'Receipt details have been extracted.' });
      } else {
        toast({ title: 'Parsing Failed', description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleAiModify = () => {
    if (!aiCommand.trim()) {
      toast({ title: 'Command is empty', description: 'Please enter a modification command.', variant: 'destructive' });
      return;
    }
    if (!isReceiptReady) {
      toast({ title: 'No Receipt Data', description: 'Parse a receipt before modifying it.', variant: 'destructive' });
      return;
    }

    startModifying(async () => {
      const currentReceiptString = JSON.stringify(receiptData);
      const result = await modifyInvoiceAction({ documentDetails: currentReceiptString, modificationRequest: aiCommand });
      if (result.success && result.data) {
        const parsedResult = result.data as ReceiptSchema;
        form.reset(parsedResult);
        toast({ title: 'Modification Successful', description: result.message });
        setAiCommand('');
      } else {
        toast({ title: 'Modification Failed', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handlePrint = () => {
    if(!isReceiptReady) return;
    document.title = `Receipt-${receiptData.vehicleNumber || 'draft'}`;
    window.print();
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><Wand2 className="text-primary" /> AI-Powered Parsing</CardTitle>
              <CardDescription>Paste your service notes below in any language (English or Telugu). Our AI will do the rest.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g.&#10;Ap05ed1314&#10;Skoda octavia style AT&#10;Babji garu&#10;Oilfilter - 650&#10;Airfilter - 950&#10;..."
                rows={8}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="font-code"
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleParse} disabled={isParsing}>
                {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Parse Receipt
              </Button>
            </CardFooter>
          </Card>

          {isReceiptReady && (
            <Form {...form}>
              <form>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Edit Receipt Details</CardTitle>
                    <CardDescription>Review and edit the parsed information below.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="customerName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl><Input placeholder="e.g. Babji garu" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="vehicleNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Number</FormLabel>
                          <FormControl><Input placeholder="e.g. AP05ED1314" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="carModel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Car Model</FormLabel>
                        <FormControl><Input placeholder="e.g. Skoda Octavia Style AT" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div>
                      <h3 className="text-lg font-medium mb-2 font-headline">Line Items</h3>
                      <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[40px]">Sl.</TableHead>
                                <TableHead className="w-[40%]">Description</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fields.map((item, index) => {
                                 const watchedItem = watchedItems[index];
                                 const quantity = Number(watchedItem?.quantity) || 0;
                                 const unitPrice = Number(watchedItem?.unitPrice) || 0;
                                 const isCalculated = quantity > 0 && unitPrice > 0;

                                 return (
                                  <TableRow key={item.id}>
                                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                      <TableCell>
                                      <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => <Input {...field} className="h-8" />} />
                                      </TableCell>
                                      <TableCell>
                                      <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => <Input type="number" {...field} className="h-8 w-24" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />} />
                                      </TableCell>
                                      <TableCell>
                                      <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => <Input type="number" {...field} className="h-8 w-16" onChange={e => field.onChange(parseInt(e.target.value) || 0)} />} />
                                      </TableCell>
                                      <TableCell>
                                      <FormField control={form.control} name={`items.${index}.total`} render={({ field }) => <Input type="number" {...field} readOnly={isCalculated} className={cn("h-8 w-24", isCalculated && "bg-muted border-none")} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />} />
                                      </TableCell>
                                      <TableCell>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                              <span className="sr-only">Remove Item</span>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Remove Item</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TableCell>
                                  </TableRow>
                                 );
                              })}
                            </TableBody>
                          </Table>
                      </div>
                       <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => append({ description: '', total: 0 })}>
                          <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </Form>
          )}
          
          {isReceiptReady && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Bot className="text-primary" /> AI Quick Edit</CardTitle>
                <CardDescription>Use natural language to modify items. e.g., "add 2 wiper blades for 500 each" or "remove engine oil".</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Enter command..."
                  value={aiCommand}
                  onChange={(e) => setAiCommand(e.target.value)}
                />
              </CardContent>
              <CardFooter>
                <Button onClick={handleAiModify} disabled={isModifying}>
                  {isModifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Apply Change
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        <div className="lg:sticky top-8">
          <Card className="shadow-lg">
            <CardHeader className="flex-row items-center justify-between no-print">
              <div>
                <CardTitle className="font-headline">Receipt Preview</CardTitle>
                <CardDescription>This is how your receipt will look.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePrint} disabled={!isReceiptReady} variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" /> Print PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-[8.5/11] bg-white rounded-md border p-2">
                <ReceiptPreview receiptData={isReceiptReady ? receiptData : null} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
