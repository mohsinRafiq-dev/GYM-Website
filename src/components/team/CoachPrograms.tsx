"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Avatar, Pill } from "@/components/ui/feedback";
import { useData } from "@/lib/store/data-context";
import { allPrograms, getProgram } from "@/lib/data/programs";
import { relativeDay, toISODate } from "@/lib/utils";

/** Team programmes: coaches build and assign; members see what's available. */
export function CoachPrograms() {
  const { data, team, canCoach, deleteCustomProgram, assignProgram } = useData();
  const [pending, setPending] = useState<string | null>(null);
  if (!data || !team) return null;

  const programs = team.customPrograms ?? [];
  const options = allPrograms();

  const assign = async (memberUid: string, programId: string) => {
    setPending(memberUid);
    try {
      await assignProgram(memberUid, programId || null);
      toast.success(programId ? "Programme assigned" : "Assignment cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the assignment.");
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Team programmes"
        subtitle={canCoach ? "Write a plan and assign it to members" : "Plans written by your coaches"}
        icon={<ClipboardList size={15} />}
        action={
          canCoach && (
            <ButtonLink href="/team/programs" variant="ghost" size="sm" icon={<Plus size={13} />}>
              New
            </ButtonLink>
          )
        }
      />
      <CardBody className="space-y-4">
        {programs.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted">
            {canCoach
              ? "No team programmes yet. Start from a built-in plan or a blank week, adjust it for your crew, then assign it below."
              : "Your coaches haven't written a team programme yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {programs.map((p) => (
              <li key={p.id} className="rounded-lg border border-line bg-panel2 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                    <p className="text-[11px] text-faint">
                      {p.daysPerWeek} days/week · by {p.custom?.createdByName}
                      {p.custom && ` · updated ${relativeDay(toISODate(new Date(p.custom.updatedAt)))}`}
                    </p>
                  </div>
                  {canCoach && (
                    <div className="flex shrink-0 gap-1">
                      <Link
                        href={`/team/programs?id=${p.id}`}
                        className="rounded p-1 text-faint transition hover:text-volt"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil size={13} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete ${p.name}? Members assigned to it lose the assignment.`)) {
                            void deleteCustomProgram(p.id);
                          }
                        }}
                        className="rounded p-1 text-faint transition hover:text-danger"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canCoach && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-faint">
              Assignments
            </p>
            <ul className="space-y-2">
              {team.members.map((m) => {
                const assigned = team.assignments?.[m.uid];
                return (
                  <li key={m.uid} className="flex items-center gap-2">
                    <Avatar name={m.displayName} src={m.photoURL} size={26} />
                    <span className="min-w-0 flex-1 truncate text-xs text-ink">{m.displayName}</span>
                    <Select
                      value={assigned?.programId ?? ""}
                      disabled={pending === m.uid}
                      onChange={(e) => void assign(m.uid, e.target.value)}
                      className="h-8 max-w-44 text-xs"
                      aria-label={`Programme for ${m.displayName}`}
                    >
                      <option value="">Not assigned</option>
                      {options.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.custom ? "★ " : ""}
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/** Shown to a member whose coach has assigned a programme they aren't running yet. */
export function AssignmentBanner() {
  const { data, team, acceptAssignment } = useData();
  if (!data || !team) return null;
  const assignment = team.assignments?.[data.profile.uid];
  if (!assignment || assignment.programId === data.profile.programId) return null;
  if (!allPrograms().some((p) => p.id === assignment.programId)) return null;
  const program = getProgram(assignment.programId);

  return (
    <Card className="border-violet/40">
      <CardBody className="pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/15 text-violet">
            <UserCheck size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold">
              {assignment.assignedByName} assigned you {program.name}
            </p>
            <p className="text-xs text-muted">
              {program.daysPerWeek} days a week
              {program.custom ? " · written for your team" : ""}
              {assignment.note ? ` — “${assignment.note}”` : ""}
            </p>
          </div>
          {program.custom && <Pill tone="violet">coach-built</Pill>}
          <Button variant="primary" size="sm" onClick={acceptAssignment}>
            Switch to this programme
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
