import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "m4v"];

export default async function GaleriaPage({ params }: { params: { venueSlug: string } }) {
  const supabase = createSupabaseServiceClient();

  const { data: files } = await supabase.storage
    .from("venue-media")
    .list(params.venueSlug, { sortBy: { column: "created_at", order: "desc" } });

  const media = (files ?? [])
    .filter((f) => f.name && !f.name.startsWith("."))
    .map((f) => {
      const { data } = supabase.storage
        .from("venue-media")
        .getPublicUrl(`${params.venueSlug}/${f.name}`);
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return {
        name: f.name,
        url: data.publicUrl,
        isVideo: VIDEO_EXTENSIONS.includes(ext),
      };
    });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-gold">Galeria</h1>
        <Link href={`/${params.venueSlug}/pedido`} className="text-sm text-muted underline">
          Voltar
        </Link>
      </div>

      {media.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((item) => (
            <div
              key={item.name}
              className="aspect-square overflow-hidden rounded-card border border-border bg-surface"
            >
              {item.isVideo ? (
                <video src={item.url} className="h-full w-full object-cover" controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-card border border-border bg-surface p-6 text-muted">
          Em breve, fotos e vídeos do {params.venueSlug.replace(/-/g, " ")} por aqui.
        </p>
      )}
    </main>
  );
}
