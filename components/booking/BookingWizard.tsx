"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Types
type Service = { id: string; name: string; durationMin: number; priceCents: number; category: string };
type Staff = { id: string; name: string };
type TimeSlot = { start: string; staffId?: string }; // ISO

// Steps
enum Step {
  SELECT_SERVICE = 0,
  SELECT_STAFF = 1,
  SELECT_DATE = 2,
  CONTACT = 3,
  SUCCESS = 4,
}

export default function BookingWizard() {
  const [step, setStep] = useState<Step>(Step.SELECT_SERVICE);
  
  // Data State
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null); // null = any

  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotStaffId, setSelectedSlotStaffId] = useState<string | null>(null);

  const [contact, setContact] = useState({ name: "", email: "", phone: "", note: "" });
  const [bookingResult, setBookingResult] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Init: Fetch Branches (Auto-select first for MVP)
  useEffect(() => {
    fetch('/api/branches').then(res => res.json()).then(data => {
        if (data.length > 0) {
            setBranches(data);
            setSelectedBranchId(data[0].id);
        }
    });
  }, []);

  // 2. Fetch Services when Branch Selected
  useEffect(() => {
    if (!selectedBranchId) return;
    fetch(`/api/branches/${selectedBranchId}/services`).then(res => res.json()).then(setServices);
  }, [selectedBranchId]);

  // 3. Fetch Staff when Service Selected
  useEffect(() => {
    if (!selectedBranchId || !selectedService) return;
    // We can fetch staff who perform this service
    fetch(`/api/branches/${selectedBranchId}/staff?serviceId=${selectedService.id}`)
        .then(res => res.json())
        .then(setStaffList);
  }, [selectedService, selectedBranchId]);

  // 4. Fetch Availability when Date/Staff changes
  useEffect(() => {
    if (!selectedBranchId || !selectedService || step !== Step.SELECT_DATE) return;
    
    setLoading(true);
    const params = new URLSearchParams({
        branchId: selectedBranchId,
        serviceId: selectedService.id,
        date: date
    });
    if (selectedStaffId) params.append("staffId", selectedStaffId);

    fetch(`/api/availability?${params}`)
        .then(res => res.json())
        .then(data => setSlots(data.slots || []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));

  }, [date, selectedStaffId, selectedService, selectedBranchId, step]);


  // Handlers
  const handleServiceSelect = (s: Service) => {
    setSelectedService(s);
    setStep(Step.SELECT_STAFF);
  };

  const handleStaffSelect = (id: string | null) => {
    setSelectedStaffId(id);
    setStep(Step.SELECT_DATE);
  };

  const handleSlotSelect = async (slot: TimeSlot) => {
    setSelectedSlot(slot.start);
    if (slot.staffId) setSelectedSlotStaffId(slot.staffId);
    setStep(Step.CONTACT);
  };

  const handleConfirm = async () => {
    if (!selectedBranchId || !selectedService || !selectedSlot) return;
    setLoading(true);
    setError(null);

    // 1. Client-side Validation
    if (contact.name.length < 2) {
        setError("Jméno je příliš krátké");
        setLoading(false);
        return;
    }
    if (!contact.email.includes("@")) { // Simple check, z.string().email() on backend
        setError("Neplatný email");
        setLoading(false);
        return;
    }
    if (contact.phone.length < 9) {
        setError("Neplatný telefon");
        setLoading(false);
        return;
    }

    // 2. Hold
    try {
        const holdRes = await fetch('/api/booking/hold', {
            method: 'POST',
            body: JSON.stringify({
                branchId: selectedBranchId,
                serviceId: selectedService.id,
                staffId: selectedStaffId || selectedSlotStaffId || staffList[0]?.id,
                startAt: selectedSlot,
                date: date
            })
        });
        
        if (!holdRes.ok) throw new Error("Slot lost or error");
        const holdData = await holdRes.json();

        // 2. Confirm
        const confirmRes = await fetch('/api/booking/confirm', {
            method: 'POST',
            body: JSON.stringify({
                holdId: holdData.holdId,
                customerName: contact.name,
                customerEmail: contact.email,
                customerPhone: contact.phone,
                note: contact.note
            })
        });

        if (!confirmRes.ok) {
            const errorData = await confirmRes.json();
            // If it's a validation error, it might be structured
            if (errorData.details) {
                // Simplified error extraction
                 throw new Error("Špatně vyplněné údaje (Email/Telefon/Jméno)");
            }
            throw new Error(errorData.error || "Confirmation failed");
        }
        const bookingData = await confirmRes.json();
        
        setBookingResult(bookingData);
        setStep(Step.SUCCESS);

    } catch (e: any) {
        setError(e.message);
    } finally {
        setLoading(false);
    }
  };

  if (step === Step.SUCCESS) {
     return (
        <CardContent className="p-8 text-center space-y-4">
             <div className="text-green-500 font-bold text-2xl">Rezervace potvrzena!</div>
             <p className="text-muted-foreground">ID: {bookingResult?.bookingId}</p>
             <p>Na váš email dorazilo potvrzení.</p>
             <Button onClick={() => window.location.reload()} variant="outline">Nová rezervace</Button>
        </CardContent>
     )
  }

  return (
    <div className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">
            {step === Step.SELECT_SERVICE && "Vyberte službu"}
            {step === Step.SELECT_STAFF && "Vyberte barbera"}
            {step === Step.SELECT_DATE && "Vyberte termín"}
            {step === Step.CONTACT && "Vaše údaje"}
        </CardTitle>
        {error && <div className="text-destructive text-sm font-medium">{error}</div>}
      </CardHeader>
      
      <CardContent>
      {/* Logic */}
      {step === Step.SELECT_SERVICE && (
        <div className="flex flex-col gap-3">
            {services.map(s => (
                <Button key={s.id} variant="outline" onClick={() => handleServiceSelect(s)} className="h-auto p-4 justify-start flex-col items-start space-y-1">
                    <div className="font-bold text-lg">{s.name}</div>
                    <div className="text-sm text-muted-foreground">{s.durationMin} min • {s.priceCents / 100} Kč</div>
                </Button>
            ))}
            {services.length === 0 && <p className="text-muted-foreground">Načítám služby...</p>}
        </div>
      )}

      {step === Step.SELECT_STAFF && (
        <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={() => handleStaffSelect(null)} className="h-auto p-4 justify-start text-lg">
                Kdokoliv (nejdřívější termín)
            </Button>
            {staffList.map(s => (
                 <Button key={s.id} variant="outline" onClick={() => handleStaffSelect(s.id)} className="h-auto p-4 justify-start text-lg">
                    {s.name}
                 </Button>
            ))}
        </div>
      )}

      {step === Step.SELECT_DATE && (
        <div className="space-y-4">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full" />
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {loading && <p className="col-span-3 text-muted-foreground">Hledám termíny...</p>}
                {!loading && slots.length === 0 && <p className="col-span-3 text-center text-muted-foreground">Žádné volné termíny.</p>}
                {slots.map(slot => (
                    <Button key={slot.start} variant="outline" onClick={() => handleSlotSelect(slot)} className="text-sm">
                        {format(parseISO(slot.start), 'HH:mm')}
                    </Button>
                ))}
            </div>
        </div>
      )}

      {step === Step.CONTACT && (
        <div className="flex flex-col gap-4">
             <Input placeholder="Jméno" value={contact.name} onChange={e => setContact({...contact, name: e.target.value})} />
             <Input placeholder="Email" value={contact.email} onChange={e => setContact({...contact, email: e.target.value})} />
             <Input placeholder="Telefon" value={contact.phone} onChange={e => setContact({...contact, phone: e.target.value})} />
             <Input placeholder="Poznámka (nepovinné)" value={contact.note} onChange={e => setContact({...contact, note: e.target.value})} />
             
             <Button disabled={loading} onClick={handleConfirm} size="lg" className="w-full mt-4">
                {loading ? "Potvrzuji..." : "Rezervovat závazně"}
             </Button>
        </div>
      )}
      </CardContent>

      <CardFooter className="justify-between">
          {step > Step.SELECT_SERVICE && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>Zpět</Button>
          )}
          <div className="text-xs text-muted-foreground ml-auto">
              Krok {step + 1} z 4
          </div>
      </CardFooter>

    </div>
  );
}
