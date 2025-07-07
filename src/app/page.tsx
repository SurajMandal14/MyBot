import { InvoiceCreator } from '@/components/invoice-creator';
import { QuotationCreator } from '@/components/quotation-creator';
import { ReceiptCreator } from '@/components/receipt-creator';
import { Logo } from '@/components/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10 text-primary" />
          <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            Flywheels Bot
          </h1>
        </div>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          Paste your vehicle service notes in any format. Our AI will instantly parse them into a professional invoice or quotation that you can edit and share.
        </p>
      </div>

      <Tabs defaultValue="invoice" className="w-full">
        <div className="flex justify-center mb-8">
            <TabsList>
                <TabsTrigger value="invoice">Invoice Creator</TabsTrigger>
                <TabsTrigger value="quotation">Quotation Creator</TabsTrigger>
                <TabsTrigger value="receipt">Receipt Creator</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="invoice">
            <InvoiceCreator />
        </TabsContent>
        <TabsContent value="quotation">
            <QuotationCreator />
        </TabsContent>
        <TabsContent value="receipt">
            <ReceiptCreator />
        </TabsContent>
      </Tabs>
    </main>
  );
}
