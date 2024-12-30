import { Inject, Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Solver } from '@2captcha/captcha-solver';

@Injectable()
export class OnlyFansService {
  constructor(@Inject('Solver') private readonly solver: Solver) {}
  private onlyFansUrl = 'https://onlyfans.com';
  private captchaApiKey = '71734859b58383e9d85678b37ed37948';

  async login(username: string, password: string) {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(this.onlyFansUrl, { waitUntil: 'networkidle2' });

    try {
      // Заповнення форми логіну
      await page.type('input[name="email"]', username, { delay: 100 });
      await page.type('input[name="password"]', password, { delay: 100 });
      await page.click('button[type="submit"]');

      // Чекаємо появи капчі
      await page.waitForSelector('iframe[src*="recaptcha"]', {
        timeout: 15000,
      });

      // Отримання siteKey капчі
      const siteKey = await page.evaluate(() => {
        const iframe: HTMLIFrameElement = document.querySelector(
          'iframe[src*="recaptcha"]',
        );
        return iframe?.src?.match(/k=([^&]*)/)?.[1];
      });

      console.log('Captcha siteKey:', siteKey);

      if (!siteKey) {
        throw new Error('Captcha siteKey not found');
      }

      const captchaToken = await this.solveCaptcha(siteKey, page.url());
      console.log('Captcha solved:', captchaToken);

      await page.evaluate((token) => {
        (
          document.querySelector('#g-recaptcha-response') as HTMLTextAreaElement
        ).value = token;
        const event = new Event('change', { bubbles: true });
        document.querySelector('#g-recaptcha-response').dispatchEvent(event);
      }, captchaToken);

      // Повторне натискання кнопки логіну
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Отримання куків
      const cookies = await page.cookies();

      // Отримання локального сховища
      const localStorage = await page.evaluate(() => {
        return JSON.stringify(window.localStorage);
      });

      // Отримання хедерів
      const headers = await page.evaluate(() => {
        return JSON.stringify({
          'User-Agent': navigator.userAgent,
          Authorization: document.cookie
            .split(';')
            .find((c) => c.includes('auth_token'))
            ?.split('=')[1],
        });
      });

      await browser.close();

      return {
        cookies,
        headers: JSON.parse(headers),
        localStorage: JSON.parse(localStorage),
      };
    } catch (error) {
      await browser.close();
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  private async solveCaptcha(siteKey: string, url: string): Promise<string> {
    console.log('Solving captcha...');
    try {
      // Solve the CAPTCHA using 2Captcha API
      const result = await this.solver.recaptcha({
        pageurl: url,
        googlekey: siteKey,
        version: 'v3',
        enterprise: 1,
      });

      console.log('Captcha solved:', result);

      if (!result || !result.data) {
        throw new Error('Failed to solve CAPTCHA');
      }

      return result.data;
    } catch (error) {
      throw new Error(`Captcha solving failed: ${error.message}`);
    }
  }
}
