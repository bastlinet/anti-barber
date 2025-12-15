import Image from "next/image";
import BookingWizard from "@/components/booking/BookingWizard";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full">
        <h1 className="text-4xl font-bold text-center w-full mb-8">Barber Shop Reservations</h1>
        <BookingWizard />
      </main>
    </div>
  );
}
