import { env } from "cloudflare:workers";
import { sendPush } from "@/lib/firebase-push";

export async function POST(request: Request) {
  const expected = (env as unknown as Record<string, string | undefined>).ALERT_UPDATE_TOKEN;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendPush({
    title: "Bangkok Rail Daily",
    body: "ทดสอบแจ้งเตือนสำเร็จ ระบบพร้อมแจ้งเหตุรถไฟฟ้าแล้ว",
    url: "/Test-BTS-TIMEING-/",
    tag: "rail-push-test",
  });
  return Response.json({ ok: true, ...result });
}
