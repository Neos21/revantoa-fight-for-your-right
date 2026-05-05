import ky from 'ky';

export const api = ky.create({
  prefix: '/'
});

export type ApiError = {
  error?: {
    code: string;
    message: string;
  };
};

export async function readApiError(error: unknown): Promise<string> {
  if(error instanceof Error && 'response' in error) {
    const response = error.response as Response;
    const payload = await response.json().catch(() => null) as ApiError | null;
    if(payload?.error?.message != null) return payload.error.message;
  }
  if(error instanceof Error) return error.message;
  return 'エラーが発生しました';
}
