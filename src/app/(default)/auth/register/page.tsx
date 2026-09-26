import Register from "@/views/Register";
import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Регистрация", "/auth/register");

export default function RegisterPage() {
    return <Register />;
}
