import { AuthForm } from "../form";
import { updatePassword } from "../actions";

export const metadata = { title: "Đặt lại mật khẩu" };

export default function ResetPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Đặt lại mật khẩu</h1>
      <AuthForm action={updatePassword} submit="Lưu mật khẩu" fields={[{ name: "password", label: "Mật khẩu mới", type: "password", autoComplete: "new-password" }]} />
    </>
  );
}
