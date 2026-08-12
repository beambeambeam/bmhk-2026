import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { orpc } from "@bmhk-2026/client/orpc";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { isAuthRole } from "./types";
import type { AdminUser, AuthRole } from "./types";

interface AdminUserRoleProps {
  readonly isCurrentUser: boolean;
  readonly roles: readonly AuthRole[];
  readonly user: AdminUser;
  readonly onRoleUpdated: (role: AuthRole) => void;
}

function getFieldErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error;

    if (typeof message === "string") {
      return message;
    }
  }

  return "Select a valid role.";
}

function getUpdateErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function AdminUserRole({ isCurrentUser, roles, user, onRoleUpdated }: AdminUserRoleProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingRole, setPendingRole] = useState<AuthRole | null>(null);
  const formId = `admin-user-role-form-${user.id}`;
  const updateRoleMutation = useMutation(
    orpc.adminUsers.setRole.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.adminUsers.list.key() });
      },
    }),
  );
  const isUpdating =
    updateRoleMutation.isPending && updateRoleMutation.variables?.userId === user.id;
  const isBusy = isUpdating || isConfirming;

  const form = useForm({
    defaultValues: {
      role: user.role,
    },
    onSubmit: ({ value }) => {
      if (value.role === user.role) {
        return;
      }

      setPendingRole(value.role);
      setIsConfirmationOpen(true);
    },
    validators: {
      onSubmit: ({ value }) =>
        isAuthRole(typeof value.role === "string" ? value.role : "", roles)
          ? undefined
          : "Select a valid role.",
    },
  });

  function handleDialogOpenChange(nextOpen: boolean): void {
    if (!nextOpen && isBusy) {
      return;
    }

    setIsDialogOpen(nextOpen);
    setIsConfirmationOpen(false);
    setPendingRole(null);
    form.reset({ role: user.role });
  }

  async function handleConfirmRoleChange(): Promise<void> {
    if (pendingRole === null || isBusy) {
      return;
    }

    setIsConfirming(true);

    try {
      await updateRoleMutation.mutateAsync({ role: pendingRole, userId: user.id });
      toast.success("Role updated");
      onRoleUpdated(pendingRole);
      setIsConfirmationOpen(false);
      setIsDialogOpen(false);
      setPendingRole(null);
      form.reset({ role: pendingRole });
    } catch (error) {
      toast.error(getUpdateErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span>{user.role}</span>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit role for ${user.email}`}
                disabled={isCurrentUser || roles.length === 0 || isBusy}
                title={isCurrentUser ? "You cannot change your own role" : undefined}
              />
            }
          >
            <Pencil aria-hidden="true" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit user role</DialogTitle>
              <DialogDescription>
                Choose a new role for {user.email}. The change affects this user&apos;s staff
                access.
              </DialogDescription>
            </DialogHeader>

            <form
              id={formId}
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <FieldGroup>
                <form.Field name="role">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && field.state.meta.errors.length > 0;

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={`${formId}-role`}>Role</FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) => {
                            if (value !== null && isAuthRole(value, roles)) {
                              field.handleChange(value);
                            }
                          }}
                        >
                          <SelectTrigger
                            id={`${formId}-role`}
                            aria-invalid={isInvalid}
                            disabled={isBusy || roles.length === 0}
                            onBlur={field.handleBlur}
                            className="w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {roles.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {isInvalid ? (
                          <FieldError>
                            {getFieldErrorMessage(field.state.meta.errors[0])}
                          </FieldError>
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>
              </FieldGroup>
            </form>

            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={isBusy}>
                    Cancel
                  </Button>
                }
              />
              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                  role: state.values.role,
                })}
              >
                {({ canSubmit, isSubmitting, role }) => (
                  <Button
                    type="submit"
                    form={formId}
                    disabled={!canSubmit || isSubmitting || isBusy || role === user.role}
                  >
                    {isSubmitting ? "Preparing..." : "Save changes"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog
        open={isConfirmationOpen}
        onOpenChange={(nextOpen) => {
          if (!isConfirming) {
            setIsConfirmationOpen(nextOpen);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm role change?</AlertDialogTitle>
            <AlertDialogDescription>
              Change {user.email}&apos;s role from {user.role} to {pendingRole ?? user.role}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isConfirming}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={isConfirming}
              onClick={() => {
                void handleConfirmRoleChange();
              }}
            >
              {isConfirming ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin" />
                  Saving
                </>
              ) : (
                "Confirm change"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export { AdminUserRole };
