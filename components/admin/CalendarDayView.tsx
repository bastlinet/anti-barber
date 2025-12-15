"use client";

import { useEffect, useState } from "react";
import { format, parseISO, differenceInMinutes, addMinutes, startOfDay, addHours } from "date-fns";
import { getCalendarData } from "@/app/admin/calendar/actions";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarDayView() {
  const [date, setDate] = useState<Date | null>(null);
  const [data, setData] = useState<{ staff: any[]; bookings: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const startHour = 8;
  const endHour = 20;

  const ensureDate = (d: string | Date) => typeof d === 'string' ? parseISO(d) : d;

  useEffect(() => {
    // Set initial date on client side
    if (!date) {
        setDate(new Date());
        return;
    }

    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");
    getCalendarData(dateStr).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [date]);

  const handlePrevDay = () => setDate((d) => (d ? addHours(d, -24) : null));
  const handleNextDay = () => setDate((d) => (d ? addHours(d, 24) : null));

  const totalMinutes = (endHour - startHour) * 60;
  const pixelsPerMinute = 2; // Height factor

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [mode, setMode] = useState<"bookings" | "shifts">("bookings");
  const [isAddingShift, setIsAddingShift] = useState<{ staffId: string, time: Date } | null>(null);

  const handleBookingClick = (e: React.MouseEvent, booking: any) => {
    e.stopPropagation();
    if (mode === "bookings") setSelectedBooking(booking);
  };

  const handleShiftClick = async (e: React.MouseEvent, shift: any) => {
      e.stopPropagation();
      if (mode === "shifts") {
          if (confirm("Smazat směnu?")) {
               const { deleteShift } = await import("@/app/admin/actions");
               await deleteShift(shift.id);
               setDate(new Date(date!)); 
          }
      }
  }

  const handleCellClick = (staffId: string, time: Date) => {
      if (mode === "shifts") {
          // Open add shift modal or direct action
          // For simplicity, let's just add a 8h shift starting at clicked time? No, let's open prompt or modal.
          // Let's use simple prompt for MVP or default 4h shift.
          setIsAddingShift({ staffId, time });
      }
  }
  
  const confirmAddShift = async (hours: number) => {
      if (!isAddingShift) return;
      const { staffId, time } = isAddingShift;
      const startAt = time;
      const endAt = addHours(startAt, hours);
      // We need branchId. The staff object in 'data.staff' has branchId.
      const staffMember = staff.find((s: any) => s.id === staffId);
      if (!staffMember) return;
      
      const { createShift } = await import("@/app/admin/actions");
      await createShift(staffId, staffMember.branchId, startAt, endAt);
      setDate(new Date(date!));
      setIsAddingShift(null);
  };

  const handleCloseModal = () => {
      setSelectedBooking(null);
      setIsAddingShift(null);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    if (confirm("Opravdu zrušit rezervaci?")) {
        const { cancelBooking } = await import("@/app/admin/actions");
        await cancelBooking(selectedBooking.id);
        setLoading(true); // Trigger reload
        // Ideally we would optimistically update or just re-fetch
        setDate(new Date(date!)); // Force effect re-run
        handleCloseModal();
    }
  };

  if (loading || !date) return <div>Načítám kalendář...</div>;
  if (!data) return <div>Žádná data</div>;

  const { staff, bookings } = data;



  return (
    <div className="flex flex-col h-full bg-white border rounded relative">
      {/* Modal */}
      {selectedBooking && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white p-6 rounded shadow-lg min-w-[300px]">
                  <h3 className="text-lg font-bold mb-2">Detail rezervace</h3>
                  <p><strong>Klient:</strong> {selectedBooking.customerName}</p>
                  <p><strong>Email:</strong> {selectedBooking.customerEmail}</p>
                  <p><strong>Tel:</strong> {selectedBooking.customerPhone}</p>
                  <p><strong>Služba:</strong> {selectedBooking.service?.name}</p>
                  <p className="mt-2 text-sm text-gray-500">{selectedBooking.note}</p>
                  
                  <div className="mt-4 flex gap-2 justify-end">
                      <button onClick={handleCancelBooking} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Zrušit</button>
                      <button onClick={handleCloseModal} className="bg-gray-200 text-black px-3 py-1 rounded hover:bg-gray-300">Zavřít</button>
                  </div>
              </div>
          </div>
      )}

      {/* Shift Modal */}
      {isAddingShift && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white p-6 rounded shadow-lg min-w-[300px]">
                  <h3 className="text-lg font-bold mb-4">Nová směna</h3>
                  <p className="mb-4">
                      Začátek: {format(isAddingShift.time, "HH:mm")}
                  </p>
                  <div className="flex gap-2 mb-4">
                       <button onClick={() => confirmAddShift(4)} className="bg-gray-100 p-2 rounded hover:bg-gray-200">+4h</button>
                       <button onClick={() => confirmAddShift(8)} className="bg-gray-100 p-2 rounded hover:bg-gray-200">+8h</button>
                       <button onClick={() => confirmAddShift(12)} className="bg-gray-100 p-2 rounded hover:bg-gray-200">+12h</button>
                  </div>
                  <button onClick={handleCloseModal} className="text-gray-500 underline text-sm w-full text-center">Zrušit</button>
              </div>
          </div>
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex gap-2 items-center">
            <button onClick={handlePrevDay} className="p-2 border rounded hover:bg-gray-50"><ChevronLeft size={20} /></button>
            <h2 className="text-xl font-bold min-w-[150px] text-center">{date ? format(date, "d. MMMM yyyy") : "..."}</h2>
            <button onClick={handleNextDay} className="p-2 border rounded hover:bg-gray-50"><ChevronRight size={20} /></button>
        </div>
        
        <div className="bg-gray-100 p-1 rounded flex gap-1 text-sm">
            <button 
                onClick={() => setMode("bookings")}
                className={`px-3 py-1 rounded ${mode === "bookings" ? "bg-white shadow text-black" : "text-gray-500"}`}
            >
                Rezervace
            </button>
            <button 
                onClick={() => setMode("shifts")}
                className={`px-3 py-1 rounded ${mode === "shifts" ? "bg-white shadow text-black" : "text-gray-500"}`}
            >
                Směny
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-auto">
         {/* Time Axis */}
         <div className="w-16 flex-shrink-0 border-r bg-gray-50">
            {Array.from({ length: endHour - startHour + 1 }).map((_, i) => {
                const hour = startHour + i;
                return (
                    <div key={hour} className="h-[120px] text-xs text-center border-b pt-2 text-gray-400 relative">
                        {hour}:00
                    </div>
                );
            })}
         </div>

         {/* Staff Columns */}
         <div className="flex-1 flex min-w-[600px]">
            {staff.map((s) => (
                <div key={s.id} className="flex-1 border-r min-w-[150px] relative">
                    {/* Header Name */}
                    <div className="h-10 border-b flex items-center justify-center font-bold bg-gray-50 sticky top-0 z-10">
                        {s.name}
                    </div>
                    
                    {/* Render Shifts (Background) */}
                    <div className="relative h-[1440px]" style={{ height: totalMinutes * pixelsPerMinute }}
                         onClick={(e) => {
                            // Find click time relative to column top
                            const rect = e.currentTarget.getBoundingClientRect();
                            const y = e.clientY - rect.top;
                            const minutes = y / pixelsPerMinute;
                            const clickTime = addMinutes(addHours(startOfDay(date!), startHour), minutes);
                            
                            // Snap to 30 mins
                            const roundedMinutes = Math.floor(minutes / 30) * 30;
                            const snappedTime = addMinutes(addHours(startOfDay(date!), startHour), roundedMinutes);
                            
                            handleCellClick(s.id, snappedTime);
                         }}
                    >
                         {s.shifts.map((shift: any) => {
                             const shiftStart = ensureDate(shift.startAt);
                             const shiftEnd = ensureDate(shift.endAt);
                             const dayStart = addHours(startOfDay(date!), startHour);
                             
                             // Calculate top and height relative to startHour
                             const startOffset = Math.max(0, differenceInMinutes(shiftStart, dayStart));
                             const duration = differenceInMinutes(shiftEnd, shiftStart);
                             
                             return (
                                 <div key={shift.id} 
                                      onClick={(e) => handleShiftClick(e, shift)}
                                      className={`absolute w-full border-l-4 pointer-events-auto cursor-pointer ${mode === "shifts" ? "bg-green-100 border-green-500 ring-2 ring-green-500 z-30" : "bg-green-50/50 border-green-200"}`}
                                      style={{ 
                                          top: startOffset * pixelsPerMinute, 
                                          height: duration * pixelsPerMinute 
                                      }}
                                 >
                                    {mode === "shifts" && <span className="text-xs p-1 text-green-700">× Smazat</span>}
                                 </div>
                             );
                         })}

                         {/* Render Bookings */}
                         {bookings
                             .filter((b: any) => b.staffId === s.id)
                             .map((b: any) => {
                                 const bStart = ensureDate(b.startAt);
                                 const bEnd = ensureDate(b.endAt);
                                 const dayStart = addHours(startOfDay(date!), startHour);

                                 const top = differenceInMinutes(bStart, dayStart) * pixelsPerMinute;
                                 const height = differenceInMinutes(bEnd, bStart) * pixelsPerMinute;

                                 if (top < 0) return null; // Started before 8:00 (handle better next time)

                                 return (
                                     <button key={b.id}
                                          onClick={(e) => handleBookingClick(e, b)}
                                          className={`absolute left-1 right-1 bg-blue-500 text-white rounded p-1 text-xs overflow-hidden shadow-sm hover:brightness-110 text-left z-20 ${mode === "shifts" ? "opacity-30 pointer-events-none" : ""}`}
                                          style={{ top, height }}
                                     >
                                        <div className="font-bold pointer-events-none">{format(bStart, "HH:mm")} - {b.service?.name}</div>
                                        <div className="pointer-events-none">{b.customerName}</div>
                                     </button>
                                 )
                             })
                         }
                    </div>
                </div>
            ))}
             {staff.length === 0 && <div className="p-4 text-gray-400">Žádní zaměstnanci k zobrazení.</div>}
         </div>
      </div>
    </div>
  );
}
