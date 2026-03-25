export interface EtherpadResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export class EtherpadClient {
  private baseUrl: string;
  private apiKey: string;
  private apiVersion = "1.3.0";

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  private async call<T = unknown>(
    fn: string,
    params: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/${this.apiVersion}/${fn}`;
    const body = new URLSearchParams();
    body.set("apikey", this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      body.set(key, String(value));
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Etherpad HTTP error ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as EtherpadResponse<T>;
    if (json.code !== 0) {
      throw new Error(`Etherpad API error: ${json.message}`);
    }
    return json.data;
  }

  async checkToken(): Promise<void> {
    await this.call("checkToken");
  }

  async createPad(padId: string, text?: string): Promise<void> {
    await this.call("createPad", { padID: padId, ...(text != null ? { text } : {}) });
  }

  async deletePad(padId: string): Promise<void> {
    await this.call("deletePad", { padID: padId });
  }

  async listAllPads(): Promise<{ padIDs: string[] }> {
    return this.call("listAllPads");
  }

  async getText(padId: string): Promise<{ text: string }> {
    return this.call("getText", { padID: padId });
  }

  async createAuthorIfNotExistsFor(
    authorMapper: string,
    name: string
  ): Promise<{ authorID: string }> {
    return this.call("createAuthorIfNotExistsFor", { authorMapper, name });
  }

  async setText(padId: string, text: string, authorId?: string): Promise<void> {
    await this.call("setText", { padID: padId, text, ...(authorId ? { authorId } : {}) });
  }

  async appendText(padId: string, text: string, authorId?: string): Promise<void> {
    await this.call("appendText", { padID: padId, text, ...(authorId ? { authorId } : {}) });
  }

  async getRevisionsCount(padId: string): Promise<{ revisions: number }> {
    return this.call("getRevisionsCount", { padID: padId });
  }

  async createDiffHTML(
    padId: string,
    startRev: number,
    endRev: number
  ): Promise<{ html: string; authors: string[] }> {
    return this.call("createDiffHTML", { padID: padId, startRev, endRev });
  }
}
