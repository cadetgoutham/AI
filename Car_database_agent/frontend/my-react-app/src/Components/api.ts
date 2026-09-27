export const API_URL: string =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export interface Car {
  id?: number | string;
  brand: string;
  model: string;
  year: number | string;
}

export interface AiResult {
  response: string;
  conversation_id: string;
  needs_clarification: boolean;
  added: boolean;
  updated: boolean;
  deleted: boolean;
  viewed: boolean;
  data: Car[] | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error("Can't reach the server. Check that the backend is running.");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* response had no JSON body */
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

export const fetchCars = async (): Promise<Car[]> => {
  const result = await request<{ data: Car[] }>("/api/fetch-cars");
  return result.data ?? [];
};

export const addCar = (car: { brand: string; model: string; year: number }) =>
  request<{ status: string; inserted_id: number }>("/api/add-cars", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(car),
  });

// conversationId is omitted on the first message of a chat and passed back
// on every follow-up so the server can continue the same conversation
// (needed when the AI asked a clarifying question).
export const sendPrompt = (prompt: string, conversationId?: string) =>
  request<AiResult>("/api/ai-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, conversation_id: conversationId }),
  });