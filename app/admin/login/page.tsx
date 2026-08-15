import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-2xl text-gold">ItsMyBday — Admin</h1>
      <LoginForm />
    </main>
  );
}
