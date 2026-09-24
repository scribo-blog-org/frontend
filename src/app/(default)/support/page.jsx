import Support from "@/views/Support";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
    title: "Поддержка",
    description: "Связаться с командой Scribo.",
    path: "/support",
});

export default function SupportPage() {
    return <Support />;
}
