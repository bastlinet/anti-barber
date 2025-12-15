"use client";

import { useState, useEffect } from "react";
import { format, addDays, parseISO } from "date-fns";

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
     return <div className="p-4 text-center text-green-600">
        <h2 className="text-2xl font-bold">Rezervace potvrzena!</h2>
        <p>ID: {bookingResult?.bookingId}</p>
        <button onClick={() => window.location.reload()} className="mt-4 underline">Nová rezervace</button>
     </div>
  }

  return (
    <div className="max-w-md mx-auto p-4 border rounded shadow-md bg-white min-h-[400px] text-black">
      {error && <div className="text-red-500 mb-2">{error}</div>}
      
      {/* Header */}
      <h2 className="text-xl font-bold mb-4">
        {step === Step.SELECT_SERVICE && "Vyberte službu"}
        {step === Step.SELECT_STAFF && "Vyberte barbera"}
        {step === Step.SELECT_DATE && "Vyberte termín"}
        {step === Step.CONTACT && "Vaše údaje"}
      </h2>

      {/* Logic */}
      {step === Step.SELECT_SERVICE && (
        <div className="flex flex-col gap-2">
            {services.map(s => (
                <button key={s.id} onClick={() => handleServiceSelect(s)} className="p-3 border rounded hover:bg-gray-50 text-left w-full text-black">
                    <div className="font-bold">{s.name}</div>
                    <div className="text-sm text-gray-600">{s.durationMin} min • {s.priceCents / 100} Kč</div>
                </button>
            ))}
            {services.length === 0 && <p>Načítám služby...</p>}
        </div>
      )}

      {step === Step.SELECT_STAFF && (
        <div className="flex flex-col gap-2">
            <button onClick={() => handleStaffSelect(null)} className="p-3 border rounded hover:bg-gray-50 text-left text-black">
                Kdokoliv (nejdřívější termín)
            </button>
            {staffList.map(s => (
                 <button key={s.id} onClick={() => handleStaffSelect(s.id)} className="p-3 border rounded hover:bg-gray-50 text-left text-black">
                    {s.name}
                 </button>
            ))}
        </div>
      )}

      {step === Step.SELECT_DATE && (
        <div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mb-4 p-2 border w-full text-black" />
            <div className="grid grid-cols-3 gap-2">
                {loading && <p className="text-black">Hledám termíny...</p>}
                {!loading && slots.length === 0 && <p className="col-span-3 text-center text-black">Žádné volné termíny.</p>}
                {slots.map(slot => (
                    <button key={slot.start} onClick={() => handleSlotSelect(slot)} className="p-2 border rounded bg-green-50 hover:bg-green-100 text-sm text-black">
                        {format(parseISO(slot.start), 'HH:mm')}
                    </button>
                ))}
            </div>
            <button onClick={() => setStep(Step.SELECT_STAFF)} className="mt-4 text-sm text-gray-500 underline">Zpět</button>
        </div>
      )}

      {step === Step.CONTACT && (
        <div className="flex flex-col gap-3">
             <input placeholder="Jméno" className="p-2 border text-black placeholder-gray-500" value={contact.name} onChange={e => setContact({...contact, name: e.target.value})} />
             <input placeholder="Email" className="p-2 border text-black placeholder-gray-500" value={contact.email} onChange={e => setContact({...contact, email: e.target.value})} />
             <input placeholder="Telefon" className="p-2 border text-black placeholder-gray-500" value={contact.phone} onChange={e => setContact({...contact, phone: e.target.value})} />
             <textarea placeholder="Poznámka (nepovinné)" className="p-2 border text-black placeholder-gray-500" value={contact.note} onChange={e => setContact({...contact, note: e.target.value})} />
             
             <button disabled={loading} onClick={handleConfirm} className="bg-black text-white p-3 rounded mt-2 disabled:opacity-50">
                {loading ? "Potvrzuji..." : "Rezervovat závazně"}
             </button>
             <button onClick={() => setStep(Step.SELECT_DATE)} className="text-sm text-gray-500 underline">Zpět</button>
        </div>
      )}

    </div>
  );
}
