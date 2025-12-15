"use client";

import { useState } from "react";
import { createStaff, toggleStaffActive } from "@/app/admin/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function StaffManagement({ staff, branches }: { staff: any[], branches: any[] }) {
  const [open, setOpen] = useState(false);
  
  async function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    const branchId = formData.get("branchId") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    
    await createStaff({ name, branchId, email, phone });
    setOpen(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Správa zaměstnanců</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} className="mr-2"/> Přidat zaměstnance</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nový zaměstnanec</DialogTitle>
              <DialogDescription>
                Vytvořte profil nového zaměstnance.
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Input name="name" placeholder="Jméno a příjmení" required />
              </div>
              <div className="grid gap-2">
                <Input name="email" placeholder="Email" type="email" />
              </div>
              <div className="grid gap-2">
                <Input name="phone" placeholder="Telefon" />
              </div>
              <div className="grid gap-2">
                <Select name="branchId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte pobočku" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit">Uložit</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Jméno</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Pobočka</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead>Akce</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {staff.map(s => (
                      <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                              <div className="flex flex-col text-sm text-muted-foreground">
                                <span>{s.email}</span>
                                <span>{s.phone}</span>
                              </div>
                          </TableCell>
                          <TableCell>{branches.find(b => b.id === s.branchId)?.name}</TableCell>
                          <TableCell>
                              <Badge variant={s.active ? "default" : "destructive"}>
                                  {s.active ? "Aktivní" : "Neaktivní"}
                              </Badge>
                          </TableCell>
                          <TableCell>
                              <Button 
                                variant="link" 
                                size="sm"
                                onClick={() => toggleStaffActive(s.id, !s.active)}
                              >
                                  {s.active ? "Deaktivovat" : "Aktivovat"}
                              </Button>
                          </TableCell>
                      </TableRow>
                  ))}
                  {staff.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground h-24">Žádní zaměstnanci</TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
      </CardContent>
    </Card>
  );
}
