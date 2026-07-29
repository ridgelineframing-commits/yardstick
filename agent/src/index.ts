import { Agent, callable, getAgentByName, routeAgentRequest } from "agents";

type Point = { x: number; y: number };
type TakeoffItem = {
  id: number;
  type: string;
  level?: string;
  name?: string;
  width?: number;
  height?: number;
  points?: Point[];
};
type Snapshot = {
  projectId: string;
  feetPerUnit: number | null;
  items: TakeoffItem[];
  statedAreas: Array<{ label: string; sf: number; page?: number }>;
};
type Finding = {
  id: string;
  severity: "blocker" | "warning" | "info";
  title: string;
  detail: string;
};
type Review = {
  generatedAt: string;
  findings: Finding[];
};
type AgentState = {
  reviewCount: number;
  lastReview: Review | null;
};

function reviewSnapshot(snapshot: Snapshot): Review {
  const findings: Finding[] = [];
  if (!snapshot.feetPerUnit) {
    findings.push({
      id: "scale-missing",
      severity: "blocker",
      title: "Scale is not set",
      detail: "Confirm the printed scale or calibrate a known dimension before relying on quantities."
    });
  }
  if (!snapshot.items.length) {
    findings.push({
      id: "takeoff-empty",
      severity: "info",
      title: "No takeoff items yet",
      detail: "Trace or detect rooms on a floor-plan sheet, then run QA again."
    });
  }
  if (snapshot.items.length && !snapshot.items.some(item => item.type === "room")) {
    findings.push({
      id: "rooms-missing",
      severity: "warning",
      title: "No rooms are traced",
      detail: "Opening and fixture counts may exist, but area and finish quantities remain incomplete."
    });
  }
  for (const item of snapshot.items) {
    if ((item.type === "door" || item.type === "window") &&
        (!(Number(item.width) > 0) || !(Number(item.height) > 0))) {
      findings.push({
        id: `opening-size-${item.id}`,
        severity: "blocker",
        title: "Opening has an invalid size",
        detail: `${item.type === "door" ? "Door" : "Window"} ${item.id} needs a valid width and height.`
      });
    }
  }
  return { generatedAt: new Date().toISOString(), findings };
}

export class TakeoffQaAgent extends Agent<Env, AgentState> {
  initialState: AgentState = { reviewCount: 0, lastReview: null };

  @callable()
  review(snapshot: Snapshot): Review {
    const result = reviewSnapshot(snapshot);
    this.setState({
      reviewCount: this.state.reviewCount + 1,
      lastReview: result
    });
    return result;
  }
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin === env.ALLOWED_ORIGIN || origin.startsWith("tauri://");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (url.pathname === "/api/review" && request.method === "POST") {
      const snapshot = await request.json<Snapshot>();
      const projectId = String(snapshot.projectId || "anonymous").replace(/[^a-z0-9_-]/gi, "").slice(0, 80);
      if (!projectId) return Response.json({ error: "projectId is required" }, { status: 400 });
      if (!Array.isArray(snapshot.items) || snapshot.items.length > 20000) {
        return Response.json({ error: "Invalid snapshot" }, { status: 400 });
      }
      const binding = env.TakeoffQaAgent as unknown as DurableObjectNamespace<TakeoffQaAgent>;
      const agent = await getAgentByName(binding, projectId);
      const result = await agent.review(snapshot);
      return Response.json(result, { headers: corsHeaders(request, env) });
    }
    return new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;
