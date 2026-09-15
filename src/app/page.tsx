import { DemoApp } from "@/components/demo/DemoApp";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireUser();
  return (
    <>
      <div className="absolute right-6 top-5 z-50">
        <LogoutButton />
      </div>
      <DemoApp />
    </>
  );
}
