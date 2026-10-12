/**
 * HTTP session for DIBBS: cookie jar, DoD consent banner, timeouts and retries.
 * Every DIBBS host (www.dibbs and dibbs2) gates content behind its own consent banner,
 * so cookies are kept per host and consent is accepted lazily, once per host.
 */
import {
  extractFormAction,
  extractHiddenFields,
  isConsentPage,
  isWafRejection,
} from "./aspnet";

/**
 * Honest, stable UA. The WAF accepts it (and curl's default), but rejects a bare
 * "Mozilla/5.0" whose other headers do not look like a real browser.
 */
export const USER_AGENT = "solicitation-browser/0.1";

export interface SessionOptions {
  timeoutMs?: number;
  /** Extra attempts after the first, on network errors, timeouts and 5xx. */
  retries?: number;
  /** Base backoff; doubles per attempt. */
  backoffMs?: number;
  /** Max requests in flight for this session (politeness cap). */
  maxConcurrency?: number;
}

export interface Page {
  url: string;
  status: number;
  contentType: string;
  /** Decoded as ISO-8859-1, the charset DIBBS declares on every page. */
  body: string;
}

export class DibbsError extends Error {}

const MAX_REDIRECTS = 10;

export class DibbsSession {
  /** Total HTTP requests issued, including redirects, retries and consent postbacks. */
  requests = 0;
  private readonly cookies = new Map<string, Map<string, string>>();
  private readonly cache = new Map<string, Promise<Page>>();
  private readonly opts: Required<SessionOptions>;
  private inFlight = 0;
  private readonly waiters: (() => void)[] = [];

  constructor(options: SessionOptions = {}) {
    this.opts = {
      timeoutMs: 60_000,
      retries: 3,
      backoffMs: 1_000,
      maxConcurrency: 2,
      ...options,
    };
  }

  /** GET a page, accepting the consent banner if it is in the way. */
  async get(url: string): Promise<Page> {
    const page = await this.request(url);
    if (!isConsentPage(page.body)) return page;
    const passed = await this.acceptConsent(page);
    // dibbs2 answers the consent post with the requested file itself, so keep it.
    // www.dibbs redirects back via `goto`, which keeps only the first query parameter,
    // so HTML targets are refetched instead of trusting where the consent post landed.
    if (
      !isConsentPage(passed.body) &&
      !passed.contentType.includes("text/html")
    )
      return passed;
    const retry = await this.request(url);
    if (isConsentPage(retry.body))
      throw new DibbsError(`Consent banner did not clear for ${url}`);
    return retry;
  }

  /** GET once per session; used for static daily files that several dates share. */
  getCached(url: string): Promise<Page> {
    let page = this.cache.get(url);
    if (!page) {
      page = this.get(url);
      page.catch(() => this.cache.delete(url));
      this.cache.set(url, page);
    }
    return page;
  }

  /**
   * ASP.NET postback from `page`: echoes every hidden field and sets the event target.
   * Returns the consent page as-is if the server session expired, so the caller can
   * re-establish it (the view state chain is lost at that point anyway).
   */
  postBack(
    page: Page,
    eventTarget: string,
    eventArgument: string,
  ): Promise<Page> {
    const action = extractFormAction(page.body, page.url);
    if (!action) throw new DibbsError(`No form to post back on ${page.url}`);
    const fields = {
      ...extractHiddenFields(page.body),
      __EVENTTARGET: eventTarget,
      __EVENTARGUMENT: eventArgument,
    };
    return this.request(action, fields);
  }

  private acceptConsent(consent: Page): Promise<Page> {
    const action = extractFormAction(consent.body, consent.url);
    if (!action)
      throw new DibbsError(`Consent page without a form at ${consent.url}`);
    return this.request(action, {
      ...extractHiddenFields(consent.body),
      butAgree: "OK",
    });
  }

  /** One logical request: follows redirects by hand so Set-Cookie on 302s lands in the jar. */
  private async request(
    url: string,
    form?: Record<string, string>,
  ): Promise<Page> {
    let current = url;
    let body: string | undefined = form
      ? new URLSearchParams(form).toString()
      : undefined;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await this.send(current, body);
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel();
        current = new URL(location, current).toString();
        body = undefined;
        continue;
      }
      const page: Page = {
        url: current,
        status: res.status,
        contentType: res.headers.get("content-type") ?? "",
        body: new TextDecoder("latin1").decode(await res.arrayBuffer()),
      };
      if (isWafRejection(page.body))
        throw new DibbsError(`Rejected by the DIBBS firewall: ${current}`);
      if (page.status >= 400)
        throw new DibbsError(`HTTP ${page.status} for ${current}`);
      return page;
    }
    throw new DibbsError(`Too many redirects from ${url}`);
  }

  /** A single HTTP exchange with timeout, retries on network errors and 5xx, and a concurrency cap. */
  private async send(url: string, body: string | undefined): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      await this.acquire();
      try {
        this.requests++;
        const res = await fetch(url, {
          method: body === undefined ? "GET" : "POST",
          headers: this.headersFor(url, body !== undefined),
          body,
          redirect: "manual",
          signal: AbortSignal.timeout(this.opts.timeoutMs),
        });
        this.storeCookies(url, res);
        if (res.status < 500 || attempt >= this.opts.retries) return res;
        await res.body?.cancel();
      } catch (error) {
        if (attempt >= this.opts.retries) throw error;
      } finally {
        this.release();
      }
      await new Promise((resolve) =>
        setTimeout(resolve, this.opts.backoffMs * 2 ** attempt),
      );
    }
  }

  private headersFor(url: string, isForm: boolean): Record<string, string> {
    const jar = this.cookies.get(new URL(url).host);
    return {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      ...(isForm
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
      ...(jar?.size
        ? { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") }
        : {}),
    };
  }

  // Cookies are scoped to the exact host. DIBBS only sets host and subdomain-of-host
  // cookies, so a full RFC 6265 jar would not change behavior here.
  private storeCookies(url: string, res: Response) {
    const host = new URL(url).host;
    for (const header of res.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const jar = this.cookies.get(host) ?? new Map<string, string>();
      jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      this.cookies.set(host, jar);
    }
  }

  private async acquire() {
    while (this.inFlight >= this.opts.maxConcurrency)
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.inFlight++;
  }

  private release() {
    this.inFlight--;
    this.waiters.shift()?.();
  }
}
