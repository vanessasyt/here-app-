export function AvatarCircle({
  user, size = 52,
}: { user: { photo_url?: string | null; bg: string; name: string }; size?: number }) {
  const initial = user.name?.[0]?.toUpperCase() ?? "?";
  if (user.photo_url) {
    return (
      <img
        src={user.photo_url}
        alt={user.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, background: user.bg, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}

export function AvatarFill({
  user,
}: { user: { photo_url?: string | null; bg: string; name: string } }) {
  const initial = user.name?.[0]?.toUpperCase() ?? "?";
  if (user.photo_url) {
    return <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center font-bold text-white text-5xl" style={{ background: user.bg }}>
      {initial}
    </div>
  );
}
