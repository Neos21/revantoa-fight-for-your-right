import ky from 'ky';

export function createAdminApi(token: string): typeof ky {
  return ky.create({
    prefix: '/',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
