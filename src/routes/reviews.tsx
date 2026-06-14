import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Star, Upload, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadPublicMedia } from "@/lib/admin-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Share your experience — Medline Diagnostics" },
      { name: "description", content: "Tell us about your experience at Medline Diagnostics, Trichy. Your feedback helps us serve you better." },
    ],
  }),
  component: ReviewsPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(10, "Please share at least a few words").max(2000),
});

function ReviewsPage() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, rating, message });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      let photo_url: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Photo must be under 5 MB");
        if (!file.type.startsWith("image/")) throw new Error("Photo must be an image");
        photo_url = await uploadPublicMedia(file, "reviews");
      }
      const { error } = await supabase.from("reviews").insert({ name, rating, message, photo_url });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <section className="bg-gradient-soft">
        <div className="mx-auto max-w-2xl px-4 py-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Patient Reviews</p>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">Share your experience</h1>
          <p className="mt-3 text-muted-foreground">
            Honest feedback helps us improve and helps other patients in Trichy choose us with confidence.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-12">
        {done ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-3 text-2xl font-bold">Thank you!</h2>
            <p className="mt-2 text-muted-foreground">
              Your review has been submitted and will appear on our site after a quick review by our team.
            </p>
            <Button asChild className="mt-6"><Link to="/">Back to home</Link></Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
            <div className="space-y-1.5">
              <Label htmlFor="rname">Your name</Label>
              <Input id="rname" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
            </div>

            <div className="space-y-1.5">
              <Label>Your rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
                    <Star className={`h-8 w-8 transition-colors ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rmsg">Your review</Label>
              <Textarea id="rmsg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rphoto">Photo (optional)</Label>
              <label htmlFor="rphoto" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground hover:border-primary/40">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Click to upload a photo (max 5 MB)"}
                <input id="rphoto" type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Submitting…" : "Submit review"}</Button>
            <p className="text-center text-xs text-muted-foreground">Reviews are moderated before being published.</p>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}
