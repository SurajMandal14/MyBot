import { InvoiceCreator } from '@/components/invoice-creator';
import { Logo } from '@/components/icons';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10 text-primary" />
          <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            InvoiceCraft Bot
          </h1>
        </div>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          Paste your vehicle service notes in any format. Our AI will instantly parse them into a professional invoice that you can edit and share.
        </p>
      </div>
      <InvoiceCreator />
    </main>
  );
}
