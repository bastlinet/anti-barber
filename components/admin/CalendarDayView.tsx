"use client";

import { useEffect, useState } from "react";
import { format, parseISO, differenceInMinutes, addMinutes, startOfDay, addHours } from "date-fns";
import { getCalendarData } from "@/app/admin/calendar/actions";
import { ChevronLeft, ChevronRight, X, User, Plus } from "lucide-react";
import { createShift, deleteShift, cancelBooking } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
               await deleteShift(shift.id);
               setDate(new Date(date!)); 
          }
      }
  }

  const handleCellClick = (staffId: string, time: Date) => {
      if (mode === "shifts") {
          setIsAddingShift({ staffId, time });
      }
  }
  
  const confirmAddShift = async (hours: number) => {
      if (!isAddingShift) return;
      const { staffId, time } = isAddingShift;
      const startAt = time;
      const endAt = addHours(startAt, hours);
      const staffMember = staff.find((s: any) => s.id === staffId);
      if (!staffMember) return;
      
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
        await cancelBooking(selectedBooking.id);
        setLoading(true); // Trigger reload
        setDate(new Date(date!)); // Force effect re-run
        handleCloseModal();
    }
  };

  if (loading || !date) return <div className="p-8 text-muted-foreground">Načítám kalendář...</div>;
  if (!data) return <div className="p-8 text-muted-foreground">Žádná data</div>;

  const { staff, bookings } = data;

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background relative overflow-hidden shadow-sm">
      {/* Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Detail rezervace</DialogTitle>
                <DialogDescription>Informace o rezervovaném termínu.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
                 <div className="grid grid-cols-3 gap-4">
                     <div className="font-semibold text-right">Klient</div>
                     <div className="col-span-2">{selectedBooking?.customerName}</div>
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                     <div className="font-semibold text-right">Email</div>
                     <div className="col-span-2 text-sm text-muted-foreground">{selectedBooking?.customerEmail}</div>
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                     <div className="font-semibold text-right">Telefon</div>
                     <div className="col-span-2 text-sm text-muted-foreground">{selectedBooking?.customerPhone}</div>
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                     <div className="font-semibold text-right">Služba</div>
                     <div className="col-span-2">{selectedBooking?.service?.name}</div>
                 </div>
                 {selectedBooking?.note && (
                     <div className="grid grid-cols-3 gap-4 bg-muted p-2 rounded">
                         <div className="font-semibold text-right">Poznámka</div>
                         <div className="col-span-2 text-sm italic">{selectedBooking.note}</div>
                     </div>
                 )}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="destructive" onClick={handleCancelBooking}>Zrušit rezervaci</Button>
                <Button variant="outline" onClick={handleCloseModal}>Zavřít</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adding Shift Modal */}
       <Dialog open={!!isAddingShift} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-xs">
            <DialogHeader>
                <DialogTitle>Nová směna</DialogTitle>
                <DialogDescription>
                   {isAddingShift && <>Začátek: {format(isAddingShift.time, "HH:mm")}</>}
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-4">
                 <Button onClick={() => confirmAddShift(4)} variant="outline" className="justify-start"><Plus size={16} className="mr-2"/> Přidat 4 hodiny</Button>
                 <Button onClick={() => confirmAddShift(8)} variant="outline" className="justify-start"><Plus size={16} className="mr-2"/> Přidat 8 hodin</Button>
                 <Button onClick={() => confirmAddShift(12)} variant="outline" className="justify-start"><Plus size={16} className="mr-2"/> Přidat 12 hodin</Button>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={handleCloseModal}>Zrušit</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/10">
        <div className="flex gap-2 items-center">
            <Button variant="outline" size="icon" onClick={handlePrevDay}><ChevronLeft size={20} /></Button>
            <h2 className="text-lg font-bold min-w-[150px] text-center">{date ? format(date, "d. MMMM yyyy") : "..."}</h2>
            <Button variant="outline" size="icon" onClick={handleNextDay}><ChevronRight size={20} /></Button>
        </div>
        
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <Button 
                variant={mode === "bookings" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setMode("bookings")}
                className="h-8 shadow-none"
            >
                Rezervace
            </Button>
            <Button 
                variant={mode === "shifts" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setMode("shifts")}
                className="h-8 shadow-none"
            >
                Směny
            </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-auto bg-white/50">
         {/* Time Axis */}
         <div className="w-14 flex-shrink-0 border-r bg-muted/10">
            {Array.from({ length: endHour - startHour + 1 }).map((_, i) => {
                const hour = startHour + i;
                return (
                    <div key={hour} className="h-[120px] text-xs text-center border-b border-border/50 pt-2 text-muted-foreground relative font-medium">
                        {hour}:00
                    </div>
                );
            })}
         </div>

         {/* Staff Columns */}
         <div className="flex-1 flex min-w-[600px] divide-x divide-border">
            {staff.map((s) => (
                <div key={s.id} className="flex-1 min-w-[150px] relative">
                    {/* Header Name */}
                    <div className="h-10 border-b flex items-center justify-center font-bold bg-muted/5 sticky top-0 z-10 backdrop-blur-sm shadow-sm gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">{s.name.charAt(0)}</div>
                        {s.name}
                    </div>
                    
                    {/* Render Shifts (Background) */}
                    <div className="relative h-[1440px] bg-background" style={{ height: totalMinutes * pixelsPerMinute }}
                         onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const y = e.clientY - rect.top;
                            const minutes = y / pixelsPerMinute;
                            // Snap to 30 mins
                            const roundedMinutes = Math.floor(minutes / 30) * 30;
                            const snappedTime = addMinutes(addHours(startOfDay(date!), startHour), roundedMinutes);
                            
                            handleCellClick(s.id, snappedTime);
                         }}
                    >
                         {/* Shifts */}
                         {s.shifts.map((shift: any) => {
                             const shiftStart = ensureDate(shift.startAt);
                             const shiftEnd = ensureDate(shift.endAt);
                             const dayStart = addHours(startOfDay(date!), startHour);
                             
                             const startOffset = Math.max(0, differenceInMinutes(shiftStart, dayStart));
                             const duration = differenceInMinutes(shiftEnd, shiftStart);
                             
                             return (
                                 <div key={shift.id} 
                                      onClick={(e) => handleShiftClick(e, shift)}
                                      className={`absolute w-full border-l-4 pointer-events-auto cursor-pointer transition-colors ${mode === "shifts" ? "bg-green-100/80 border-green-500 hover:bg-green-200 z-30" : "bg-green-50/30 border-green-200/50"}`}
                                      style={{ 
                                          top: startOffset * pixelsPerMinute, 
                                          height: duration * pixelsPerMinute 
                                      }}
                                 >
                                    {mode === "shifts" && <span className="absolute top-1 right-1 text-xs px-1.5 py-0.5 bg-white/50 rounded-full text-green-700 font-bold hover:bg-white hover:text-red-600 transition-colors">×</span>}
                                 </div>
                             );
                         })}

                         {/* Bookings */}
                         {bookings
                             .filter((b: any) => b.staffId === s.id)
                             .map((b: any) => {
                                 const bStart = ensureDate(b.startAt);
                                 const bEnd = ensureDate(b.endAt);
                                 const dayStart = addHours(startOfDay(date!), startHour);

                                 const top = differenceInMinutes(bStart, dayStart) * pixelsPerMinute;
                                 const height = differenceInMinutes(bEnd, bStart) * pixelsPerMinute;

                                 if (top < 0) return null;

                                 return (
                                     <Card key={b.id}
                                          onClick={(e) => handleBookingClick(e, b)}
                                          className={`absolute left-1 right-1 p-2 rounded-md shadow-sm border-l-4 overflow-hidden cursor-pointer transition-all hover:shadow-md z-20 ${
                                              mode === "shifts" ? "opacity-30 pointer-events-none grayscale" : "bg-primary/10 border-l-primary hover:bg-primary/20"
                                          }`}
                                          style={{ top, height, borderRadius: 4 }}
                                     >
                                        <div className="font-bold text-xs truncate leading-tight">{format(bStart, "HH:mm")} - {b.service?.name}</div>
                                        <div className="text-xs truncate text-muted-foreground mt-0.5">{b.customerName}</div>
                                     </Card>
                                 )
                             })
                         }
                    </div>
                </div>
            ))}
             {staff.length === 0 && <div className="p-8 text-center w-full text-muted-foreground">Žádní zaměstnanci k zobrazení.</div>}
         </div>
      </div>
    </div>
  );
}
