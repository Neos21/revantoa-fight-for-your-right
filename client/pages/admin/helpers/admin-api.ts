import ky from 'ky';

export const createAdminApi = (token: string): typeof ky => ky.create({
  headers: { Authorization: `Bearer ${token}` }
});
