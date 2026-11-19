import { expect, type APIRequestContext } from '@playwright/test';
import { LabApi } from '@api/lab-api';
import type { LabConfig, LabEvent } from '@api/types';

/**
 * Wraps the lab's global scenario switches.
 * Settings affect every test running against the same lab, so anything changed here
 * is restored by the `lab` fixture after the test.
 */
export class LabControls {
  private readonly api: LabApi;
  private dirty = false;

  constructor(request: APIRequestContext) {
    this.api = new LabApi(request);
  }

  get changed(): boolean {
    return this.dirty;
  }

  async set(patch: Partial<LabConfig>): Promise<LabConfig> {
    this.dirty = true;
    const response = await this.api.patchConfig(patch);
    expect(response.status(), `apply lab config ${JSON.stringify(patch)}`).toBe(200);
    return (await response.json()) as LabConfig;
  }

  async reset(): Promise<void> {
    const response = await this.api.restoreDefaults();
    expect(response.status(), 'restore lab defaults').toBe(200);
    this.dirty = false;
  }

  async current(): Promise<LabConfig> {
    return (await (await this.api.getConfig()).json()) as LabConfig;
  }

  /** Mirrored events for one order, oldest first. */
  async eventsFor(orderId: string): Promise<LabEvent[]> {
    const events = (await (await this.api.events()).json()) as LabEvent[];
    return events.filter((event) => event.orderId === orderId).sort((a, b) => a.seq - b.seq);
  }
}
