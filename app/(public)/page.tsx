import BookingWizard from "@/components/booking/BookingWizard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Hero Section */}
      <section className="relative w-full py-24 lg:py-32 xl:py-48 bg-muted/20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Experience the Art of Grooming
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Premium cuts, classic shaves, and a relaxing atmosphere. Book your appointment today.
              </p>
            </div>
            <div className="space-x-4">
              <Button size="lg" className="h-12 px-8 text-lg" asChild>
                <Link href="#booking">Book Appointment</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg" asChild>
                <Link href="#services">View Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Wizard Section */}
      <section className="container px-4 md:px-6 w-full max-w-4xl mx-auto scroll-mt-24" id="booking">
        <div className="flex flex-col space-y-4 text-center mb-8">
             <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Book Online</h2>
             <p className="text-muted-foreground">Select a service and time that works for you.</p>
        </div>
        <div className="bg-card border rounded-xl shadow-sm">
             <BookingWizard />
        </div>
      </section>

      {/* Services Section Placeholder */}
      <section className="container px-4 md:px-6 w-full mx-auto scroll-mt-24" id="services">
        <div className="flex flex-col space-y-4 text-center mb-8">
             <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Our Services</h2>
             <p className="text-muted-foreground">Masterful cuts and shaves.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
             {/* Service Cards will go here */}
             <div className="p-6 border rounded-xl bg-card">
                 <h3 className="text-lg font-bold">Classic Haircut</h3>
                 <p className="text-muted-foreground">45 min • 650 Kč</p>
             </div>
             <div className="p-6 border rounded-xl bg-card">
                 <h3 className="text-lg font-bold">Beard Trim</h3>
                 <p className="text-muted-foreground">30 min • 450 Kč</p>
             </div>
             <div className="p-6 border rounded-xl bg-card">
                 <h3 className="text-lg font-bold">Hot Towel Shave</h3>
                 <p className="text-muted-foreground">45 min • 550 Kč</p>
             </div>
        </div>
      </section>
    </div>
  );
}
