"use client";

import { toggleServiceActive } from "@/app/admin/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ServiceManagement({ services }: { services: any[] }) {
  return (
    <Card>
      <CardHeader>
          <CardTitle>Správa služeb</CardTitle>
      </CardHeader>
      <CardContent>
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Název</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Trvání</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead>Akce</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {services.map(s => (
                      <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{s.category}</TableCell>
                          <TableCell>{s.durationMin} min</TableCell>
                          <TableCell>
                              <Badge variant={s.active ? "default" : "destructive"}>
                                  {s.active ? "Aktivní" : "Neaktivní"}
                              </Badge>
                          </TableCell>
                          <TableCell>
                              <Button 
                                variant="link" 
                                size="sm"
                                onClick={() => toggleServiceActive(s.id, !s.active)}
                              >
                                  {s.active ? "Deaktivovat" : "Aktivovat"}
                              </Button>
                          </TableCell>
                      </TableRow>
                  ))}
                  {services.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground h-24">Žádné služby</TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
      </CardContent>
    </Card>
  );
}
