import { BaseApi } from './base-api';

export class AuthApi extends BaseApi {
  register(body: { name?: string; email?: string; password?: string }) {
    return this.request.post('/api/auth/register', { data: body });
  }

  login(body: { email?: string; password?: string }) {
    return this.request.post('/api/auth/login', { data: body });
  }

  me() {
    return this.request.get('/api/auth/me', { headers: this.headers() });
  }

  logout() {
    return this.request.post('/api/auth/logout', { headers: this.headers(), data: {} });
  }
}
