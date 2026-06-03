"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/shop/StarRating";
import { useToast } from "@/components/ui/use-toast";
import {
  BadgeCheck,
  Check,
  Trash2,
  Undo2,
  ExternalLink,
  Star,
  Loader2,
  MessageSquare,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  moderateReview,
  deleteReview,
  replyToReview,
  type AdminReviewRow,
} from "@/actions/reviews";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Filter = "pending" | "approved" | "all";

interface ReviewsModerationProps {
  reviews: AdminReviewRow[];
  counts: { pending: number; approved: number; total: number };
  activeFilter: Filter;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "approved", label: "Aprobadas" },
  { key: "all", label: "Todas" },
];

export default function ReviewsModeration({
  reviews,
  counts,
  activeFilter,
}: ReviewsModerationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Review id whose reply editor is open, + its current draft text.
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const countFor = (f: Filter) =>
    f === "pending" ? counts.pending : f === "approved" ? counts.approved : counts.total;

  function runAction(
    id: string,
    fn: () => Promise<{ success: boolean; error?: string }>,
    successMsg: string
  ): Promise<void> {
    setBusyId(id);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await fn();
        if (result.success) {
          toast({ title: successMsg });
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: result.error || "Algo salió mal",
            variant: "destructive",
          });
        }
        setBusyId(null);
        resolve();
      });
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            asChild
            size="sm"
            variant={activeFilter === f.key ? "default" : "outline"}
          >
            <Link href={`/admin/resenas?filter=${f.key}`}>
              {f.label}
              <Badge
                variant="secondary"
                className="ml-2 px-1.5 py-0 text-[10px]"
              >
                {countFor(f.key)}
              </Badge>
            </Link>
          </Button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Star className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">
              {activeFilter === "pending"
                ? "No hay reseñas pendientes de moderación."
                : "No hay reseñas para mostrar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const isBusy = busyId === review.id && pending;
            return (
              <Card key={review.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Top row: rating + status + product */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StarRating value={review.rating} size="sm" />
                        <span className="text-sm font-medium">
                          {review.customerName}
                        </span>
                        {review.verified && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Verificada
                          </span>
                        )}
                        {review.approved ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Aprobada
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            Pendiente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {review.customerEmail} ·{" "}
                        {formatDistanceToNow(new Date(review.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>

                    {review.productSlug ? (
                      <Link
                        href={`/productos/${review.productSlug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      >
                        {review.productName}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {review.productName}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  {review.title && (
                    <p className="text-sm font-semibold">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  )}

                  {review.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {review.images.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt={`Foto ${i + 1} de la reseña`}
                          className="h-14 w-14 rounded-md object-cover border"
                        />
                      ))}
                    </div>
                  )}

                  {/* Existing store reply (read-only display) */}
                  {review.reply && replyOpenId !== review.id && (
                    <div className="rounded-md border-l-2 border-primary bg-muted/50 p-3">
                      <p className="text-xs font-semibold text-primary mb-1">
                        Respuesta de la tienda
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {review.reply}
                      </p>
                    </div>
                  )}

                  {/* Reply editor */}
                  {replyOpenId === review.id && (
                    <div className="space-y-2 rounded-md border p-3">
                      <Textarea
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Escribe una respuesta pública a esta reseña..."
                        className="text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={isBusy}
                          onClick={() =>
                            runAction(
                              review.id,
                              () =>
                                replyToReview({
                                  id: review.id,
                                  reply: replyDraft,
                                }),
                              "Respuesta guardada"
                            ).then(() => setReplyOpenId(null))
                          }
                        >
                          {isBusy ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Guardar respuesta
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReplyOpenId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {review.approved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() =>
                          runAction(
                            review.id,
                            () =>
                              moderateReview({
                                id: review.id,
                                approved: false,
                              }),
                            "Reseña ocultada"
                          )
                        }
                      >
                        {isBusy ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Undo2 className="mr-2 h-4 w-4" />
                        )}
                        Quitar publicación
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() =>
                          runAction(
                            review.id,
                            () =>
                              moderateReview({
                                id: review.id,
                                approved: true,
                              }),
                            "Reseña aprobada"
                          )
                        }
                      >
                        {isBusy ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Aprobar
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() =>
                        runAction(
                          review.id,
                          () =>
                            moderateReview({
                              id: review.id,
                              verified: !review.verified,
                            }),
                          review.verified
                            ? "Marca de verificación quitada"
                            : "Marcada como verificada"
                        )
                      }
                    >
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      {review.verified ? "Quitar verificación" : "Marcar verificada"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => {
                        setReplyOpenId(
                          replyOpenId === review.id ? null : review.id
                        );
                        setReplyDraft(review.reply ?? "");
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {review.reply ? "Editar respuesta" : "Responder"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      disabled={isBusy}
                      onClick={() => setDeleteId(review.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reseña?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La reseña se eliminará
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (!deleteId) return;
                const id = deleteId;
                setDeleteId(null);
                runAction(id, () => deleteReview(id), "Reseña eliminada");
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
