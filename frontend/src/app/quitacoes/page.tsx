import { redirect } from 'next/navigation'

/** URL antiga em plural redireciona para a rota alinhada ao legado Quitacao/admin */
export default function QuitacoesRedirectPage() {
  redirect('/quitacao/admin')
}
