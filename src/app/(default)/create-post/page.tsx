import CreatePost from "@/views/CreatePost";
import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Новая статья", "/create-post");

export default function CreatePostPage() {
    return <CreatePost />;
}
