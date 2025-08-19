import { BusinessLayout } from '@/components/business/layout';

export default function BusinessGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BusinessLayout>{children}</BusinessLayout>;
}