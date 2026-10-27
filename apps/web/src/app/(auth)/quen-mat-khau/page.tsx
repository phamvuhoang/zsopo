import { AuthForm } from "../form";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Quên mật khẩu" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Quên mật khẩu</h1>
      <p className="mt-2 text-sm">Nhập email tài khoản, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>
      <AuthForm action={requestPasswordReset} submit="Gửi liên kết đặt lại" fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]} />
    </>
  );
}
