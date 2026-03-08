import { useClipPosts } from "@/hooks/useClipPosts";

interface Props {
  clipId: number;
}

export function ClipPostHistoryPanel({ clipId }: Props) {
  const { data, isLoading } = useClipPosts(clipId);
  const posts = data?.posts ?? [];

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading history...</div>;

  if (posts.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
        No posts yet
      </div>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto rounded-md border text-sm">
      <table className="w-full">
        <thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Date</th>
            <th className="px-2 py-1.5 text-left font-medium">Platform</th>
            <th className="px-2 py-1.5 text-left font-medium">Region</th>
            <th className="px-2 py-1.5 text-left font-medium">Caption</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} className="border-t">
              <td className="px-2 py-1.5 text-muted-foreground">
                {post.postedAt
                  ? new Date(post.postedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </td>
              <td className="px-2 py-1.5">{post.platform ?? "—"}</td>
              <td className="px-2 py-1.5">{post.region ?? "—"}</td>
              <td className="max-w-[120px] truncate px-2 py-1.5 text-muted-foreground">
                {post.captionUsed ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
