import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "../form";
import { signIn, signUp } from "../actions";
import { GoogleButton } from "./google-button";

export const metadata = { title: "Đăng nhập" };

export default function LoginPage({ searchParams }: PageProps<"/dang-nhap">) {
  return (
    <Suspense fallback={<h1 className="text-3xl font-semibold">Đăng nhập</h1>}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/dang-nhap">, "searchParams">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const register = sp.mode === "dang-ky";
  return (
    <>
      <h1 className="text-3xl font-semibold">{register ? "Tạo tài khoản" : "Đăng nhập"}</h1>
      {sp.loi && (
        <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
          Liên kết đăng nhập không hợp lệ hoặc đã hết hạn.
        </p>
      )}
      {register ? (
        <AuthForm
          action={signUp}
          submit="Tạo tài khoản"
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Mật khẩu", type: "password", autoComplete: "new-password" },
          ]}
        />
      ) : (
        <AuthForm
          action={signIn}
          submit="Đăng nhập"
          hidden={{ next }}
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Mật khẩu", type: "password", autoComplete: "current-password" },
          ]}
        />
      )}
      <GoogleButton next={next} />
      <nav className="mt-6 flex justify-between text-sm">
        <Link href="/quen-mat-khau" className="underline">
          Quên mật khẩu?
        </Link>
        <Link href={register ? "/dang-nhap" : "/dang-nhap?mode=dang-ky"} className="underline">
          {register ? "Đã có tài khoản" : "Tạo tài khoản khách"}
        </Link>
      </nav>
    </>
  );
}
