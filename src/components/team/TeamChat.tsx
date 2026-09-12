"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Megaphone, MessagesSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Avatar, Pill } from "@/components/ui/feedback";
import { useData } from "@/lib/store/data-context";
import { cn, relativeDay, toISODate } from "@/lib/utils";

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/**
 * Team chat. Messages arrive live — Firestore listeners in Firebase mode,
 * storage events across tabs in local mode — and every send is a transaction,
 * so two people typing at once never overwrite each other.
 */
export function TeamChat() {
  const { data, team, storage, canCoach, postToTeam } = useData();
  const [draft, setDraft] = useState("");
  const [announce, setAnnounce] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => (team ? [...team.posts].sort((a, b) => a.createdAt - b.createdAt).slice(-150) : []),
    [team],
  );

  // Stick to the newest message whenever one arrives.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (!data || !team) return null;

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await postToTeam(body, announce && canCoach ? "announcement" : "cheer");
      setDraft("");
      setAnnounce(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Message not sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Team chat"
        subtitle={
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
            </span>
            {storage === "firebase" ? "Live for everyone in the team" : "Live across tabs in this browser"}
          </span>
        }
        icon={<MessagesSquare size={15} />}
      />
      <CardBody>
        <div
          ref={listRef}
          className="scroll-thin h-96 space-y-1 overflow-y-auto rounded-lg border border-line bg-bg2 p-3"
          aria-live="polite"
        >
          {messages.length === 0 && (
            <p className="py-10 text-center text-xs text-faint">No messages yet. Say something.</p>
          )}
          {messages.map((post, i) => {
            const previous = messages[i - 1];
            const mine = post.uid === data.profile.uid;
            const day = toISODate(new Date(post.createdAt));
            const newDay = !previous || toISODate(new Date(previous.createdAt)) !== day;
            const grouped =
              !newDay && previous?.uid === post.uid && post.createdAt - previous.createdAt < 5 * 60_000;
            const special = post.kind === "announcement" || post.kind === "pr" || post.kind === "checkin";

            return (
              <div key={post.id}>
                {newDay && (
                  <p className="py-2 text-center text-[10px] uppercase tracking-widest text-faint">
                    {relativeDay(day)}
                  </p>
                )}

                {post.kind === "checkin" ? (
                  <p className="py-1 text-center text-[11px] text-faint">
                    {post.body} · {time(post.createdAt)}
                  </p>
                ) : (
                  <div className={cn("flex gap-2", mine && "flex-row-reverse", grouped ? "mt-0.5" : "mt-2")}>
                    <div className="w-7 shrink-0">
                      {!grouped && !mine && (
                        <Avatar name={post.authorName} src={post.authorPhoto} size={28} />
                      )}
                    </div>
                    <div className={cn("max-w-[80%]", mine && "text-right")}>
                      {!grouped && (
                        <p className={cn("mb-0.5 flex items-center gap-1.5 text-[10px] text-faint", mine && "justify-end")}>
                          <span className="font-medium text-muted">{mine ? "You" : post.authorName}</span>
                          {special && (
                            <Pill tone={post.kind === "pr" ? "violet" : "ember"}>{post.kind}</Pill>
                          )}
                          <span>{time(post.createdAt)}</span>
                        </p>
                      )}
                      <p
                        className={cn(
                          "inline-block rounded-2xl px-3 py-1.5 text-left text-sm leading-relaxed",
                          post.kind === "announcement"
                            ? "border border-ember/30 bg-ember/10 text-ink"
                            : mine
                              ? "bg-volt text-volt-ink"
                              : "bg-panel2 text-ink",
                        )}
                      >
                        {post.body}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={announce ? "Announcement to the whole team…" : "Message the team…"}
            maxLength={500}
            aria-label="Message"
          />
          {canCoach && (
            <Button
              type="button"
              variant={announce ? "ember" : "ghost"}
              size="icon"
              onClick={() => setAnnounce((v) => !v)}
              aria-pressed={announce}
              aria-label="Send as announcement"
              title="Send as announcement"
            >
              <Megaphone size={15} />
            </Button>
          )}
          <Button type="submit" variant="primary" loading={sending} icon={<Send size={14} />}>
            Send
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
