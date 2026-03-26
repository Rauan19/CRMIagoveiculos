import { redirect } from 'next/navigation'

/** Equivale ao módulo Quitacao no legado; admin é a tela de controle */
export default function QuitacaoIndexPage() {
  redirect('/quitacao/admin')
}
