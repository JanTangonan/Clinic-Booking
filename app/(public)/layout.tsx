export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* Public nav: logo, Services, Book Now, Login */}
      <main>{children}</main>
    </div>
  );
}
