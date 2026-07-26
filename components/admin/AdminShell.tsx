import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen min-w-[1280px] bg-slate-50">
      <AdminSidebar />

      <div className="ml-72 min-h-screen">
        <AdminTopbar />

        <main className="min-h-[calc(100vh-4.5rem)] p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
