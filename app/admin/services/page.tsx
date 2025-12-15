import { prisma } from "@/lib/prisma";
import ServiceManagement from "@/components/admin/ServiceManagement";

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ 
      orderBy: { category: 'asc' } 
  });

  return <ServiceManagement services={services} />;
}
