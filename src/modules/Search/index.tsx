"use client";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUserSearch } from "@/hooks/queries/useUserSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export default function Search() {
  const params = useSearchParams();
  const t = useTranslations("userSearch");
  const q = (params.get("q") ?? "").trim().replace(/^@/, "").trim();
  const query = useUserSearch(q);
  const users = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.data)
        .map((user) => [user.id, user]),
    ).values(),
  ];
  return (
    <Card className="mx-auto w-full max-w-3xl min-w-0 shadow-md">
      <CardTitle className="px-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </CardTitle>

      <CardContent>
        {!q ? (
          <p>{t("prompt")}</p>
        ) : q.length > 100 ? (
          <p role="alert">{t("tooLong")}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {t("results", { query: q })}
            </p>
            {query.isPending && <LoadingSkeleton variant="users" />}
            {query.isError && (
              <div role="alert">
                <p>{t("error")}</p>
                <Button
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() =>
                    void (query.isFetchNextPageError
                      ? query.fetchNextPage()
                      : query.refetch())
                  }
                >
                  {t("retry")}
                </Button>
              </div>
            )}
            {query.data && !users.length && <p>{t("empty")}</p>}
            <ul className="space-y-2">
              {users.map((user) => (
                <li key={user.id}>
                  <Link
                    href={`/@${encodeURIComponent(user.username)}`}
                    aria-label={t("viewProfile", { name: user.displayName })}
                    className="flex gap-4 rounded-xl p-4 hover:bg-accent"
                  >
                    <Avatar size="lg">
                      <AvatarImage
                        src={user.avatarUrl ?? undefined}
                        alt={user.displayName}
                      />
                      <AvatarFallback>
                        {user.displayName.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {user.displayName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="mt-1 line-clamp-2 break-words text-sm">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {query.hasNextPage && !query.isFetchNextPageError && (
              <Button
                variant="outline"
                disabled={query.isFetching}
                onClick={() => void query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? t("loadingMore") : t("more")}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
