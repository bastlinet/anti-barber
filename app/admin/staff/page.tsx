import { prisma } from "@/lib/prisma";
import StaffManagement from "@/components/admin/StaffManagement";

export default async function StaffPage() {
  const staff = await prisma.staff.findMany({ 
      orderBy: { name: 'asc' } 
  });
  const branches = await prisma.branch.findMany();

  return <StaffManagement staff={staff} branches={branches} />;
}
