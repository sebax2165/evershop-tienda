import { getConfig } from '../../../lib/util/getConfig.js';

export const getCookieSecret = (): string =>
  process.env.COOKIE_SECRET || getConfig('system.session.cookieSecret', 'keyboard cat');
