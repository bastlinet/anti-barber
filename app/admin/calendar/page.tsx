import CalendarDayView from "@/components/admin/CalendarDayView";

export default function CalendarPage() {
  return (
    <div className="h-[calc(100vh-100px)]">
      <h1 className="text-2xl font-bold mb-4">Kalendář</h1>
      <CalendarDayView />
    </div>
  );
}
