"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  ScrollText,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  listPolicies,
  deletePolicy,
  togglePolicyActive,
  type PolicyRow,
  type PolicyType,
} from "@/actions/policies"
import { CreatePolicyDialog } from "./CreatePolicyDialog"

interface Props {
  initialPolicies: PolicyRow[]
}

const POLICY_TYPE_LABEL: Record<PolicyType, string> = {
  TERMS: "Términos",
  PRIVACY: "Privacidad",
  SHIPPING: "Envíos",
  REFUND: "Devoluciones",
  OTHER: "Otra",
}

export function PolicyListTable({ initialPolicies }: Props) {
  const router = useRouter()
  const [policies, setPolicies] = useState<PolicyRow[]>(initialPolicies)
  const [createOpen, setCreateOpen] = useState(false)

  async function refresh() {
    try {
      const fresh = await listPolicies()
      setPolicies(fresh)
    } catch {
      router.refresh()
    }
  }

  function handleCreated(id: string) {
    setCreateOpen(false)
    router.push(`/admin/politicas/${id}`)
  }

  const dateFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Políticas</h1>
          <p className="text-muted-foreground">
            Términos, privacidad, envíos, devoluciones y otras políticas
            legales de la tienda.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear política
        </Button>
      </div>

      {policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <ScrollText className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 max-w-md text-muted-foreground">
            Aún no hay políticas. Creá la primera para empezar.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primera política
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Política</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead className="hidden lg:table-cell">Estado</TableHead>
                <TableHead className="hidden md:table-cell">
                  Última edición
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <PolicyRowItem
                  key={p.id}
                  policy={p}
                  onMutate={refresh}
                  dateFormatter={dateFormatter}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreatePolicyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}

interface RowProps {
  policy: PolicyRow
  onMutate: () => Promise<void> | void
  dateFormatter: Intl.DateTimeFormat
}

function PolicyRowItem({ policy, onMutate, dateFormatter }: RowProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const editorHref = `/admin/politicas/${policy.id}`
  const publicHref = `/politicas/${policy.slug}`

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await togglePolicyActive(policy.id)
        toast.success(policy.active ? "Política oculta" : "Política activada")
        await onMutate()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "No se pudo cambiar el estado",
        )
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deletePolicy(policy.id)
        toast.success("Política eliminada")
        setConfirmOpen(false)
        await onMutate()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "No se pudo eliminar",
        )
      }
    })
  }

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => router.push(editorHref)}>
        <TableCell>
          <div className="font-medium">{policy.title}</div>
          <code className="text-xs text-muted-foreground">/politicas/{policy.slug}</code>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {policy.policyType ? (
            <Badge variant="secondary">{POLICY_TYPE_LABEL[policy.policyType]}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {policy.active ? (
            <Badge variant="default">Visible</Badge>
          ) : (
            <Badge variant="secondary">Oculta</Badge>
          )}
        </TableCell>
        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
          {dateFormatter.format(policy.updatedAt)}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={pending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                aria-label="Opciones"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => router.push(editorHref)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={publicHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver pública
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleToggle} disabled={pending}>
                {policy.active ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Activar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setConfirmOpen(true)
                }}
                className="text-destructive focus:text-destructive"
                disabled={pending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar política?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. La URL{" "}
              <code>/politicas/{policy.slug}</code> dejará de estar disponible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
