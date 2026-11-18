// Vercel serves this endpoint to the browser. Only public Supabase values belong here.
export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    supabaseUrl: "https://wyrasydffupqywehdnze.supabase.co",
    supabasePublishableKey: "sb_publishable_hP842_Pan1vvf_M6mVvZUg_Esua_raQ",
  });
}
