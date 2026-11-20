import type { Locator, Page } from '@playwright/test';

/** QA laboratory (#lab): scenario controls, service health and the event stream. */
export class LabPage {
  readonly heading: Locator;
  readonly transport: Locator;
  readonly servicePills: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Curiosity, in control.' });
    this.transport = page.locator('#transport');
    this.servicePills = page.locator('#services .service-pill');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#lab');
  }

  service(name: string): Locator {
    return this.servicePills.filter({ hasText: new RegExp(`\\b${name}\\b`) });
  }
}
