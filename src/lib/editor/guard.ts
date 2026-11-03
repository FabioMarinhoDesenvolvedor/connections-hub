import { NextResponse } from 'next/server';
import { DatabaseUnavailable } from '@/lib/comments/db';
import { BadBody } from '@/lib/comments/input';
import { currentAdmin, sameOrigin } from '@/lib/comments/session';
import { BadImage } from './images';
import { GithubError, GithubNotConfigured } from './github';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/*
  Every editor route: only the signed-in owner, and for anything that changes data, only from
  a page of this site. Known failures become a JSON error the editor can show in Portuguese.
*/
export async function editorRoute(request: Request, handler: () => Promise<Response>): Promise<Response> {
  if (request.method !== 'GET' && !sameOrigin(request)) return NextResponse.json({ error: 'Origem não permitida.' }, { status: 403 });
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Entre de novo no painel.' }, { status: 401 });
  try {
    return await handler();
  } catch (error) {
    if (error instanceof BadBody) return NextResponse.json({ error: error.message === 'size' ? 'Grande demais.' : 'Pedido inválido.' }, { status: error.message === 'size' ? 413 : 400 });
    if (error instanceof BadImage) return NextResponse.json({ error: 'Não é uma imagem válida, ou passa de 40 megapixels.' }, { status: 400 });
    if (error instanceof DatabaseUnavailable) return NextResponse.json({ error: 'O banco não respondeu. Tente de novo.' }, { status: 503 });
    if (error instanceof GithubNotConfigured) return NextResponse.json({ error: 'Falta configurar o acesso ao GitHub (GITHUB_CONTENT_TOKEN).' }, { status: 503 });
    if (error instanceof GithubError) {
      console.error('editor github:', error.status, error.message);
      return NextResponse.json({ error: `O GitHub recusou (${error.status}): ${error.message}` }, { status: 502 });
    }
    throw error;
  }
}
